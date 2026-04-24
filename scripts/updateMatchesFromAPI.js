// scripts/updateMatchesFromAPI.js
const admin = require('firebase-admin');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// ===== CONFIGURAÇÃO =====
// Opção 1: Use o arquivo da chave de serviço (recomendado localmente)
const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ Arquivo da chave não encontrado em:', serviceAccountPath);
  process.exit(1);
}
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

// Sua chave da API-FOOTBALL (obtenha em https://dashboard.api-football.com/register)
const API_KEY = 'a43dd2c524991ea0a580de75b369596e'; 
const API_BASE = 'https://v3.football.api-sports.io/';

// ===== 1. Buscar todas as partidas da Copa 2026 =====
async function fetchFixtures() {
  console.log('📡 Buscando jogos da Copa 2026 na API-FOOTBALL...');
  try {
    const response = await axios.get(`${API_BASE}fixtures`, {
      headers: { 'x-apisports-key': API_KEY },
      params: {
        league: 1,        // ID da Copa do Mundo
        season: 2026
      }
    });
    const fixtures = response.data.response;
    console.log(`✅ Encontrados ${fixtures.length} jogos.`);
    return fixtures;
  } catch (error) {
    console.error('❌ Erro ao buscar jogos:', error.message);
    if (error.response) console.error(error.response.data);
    return [];
  }
}

// ===== 2. Mapear nomes dos times da API para os nomes usados no seu banco =====
// Ajuste o mapeamento conforme necessário (ex: "United States" -> "USA")
const teamNameMap = {
  "United States": "USA",
  "Korea Republic": "South Korea",
  "Czechia": "Czech Republic",
  "Bosnia-Herzegovina": "Bosnia and Herzegovina",
  "DR Congo": "DR Congo",
  "Côte d'Ivoire": "Ivory Coast",
  "Curacao": "Curacao",
  "Cape Verde Islands": "Cape Verde",
  // Adicione outros conforme necessário
};

function normalizeTeamName(apiName) {
  return teamNameMap[apiName] || apiName;
}

// ===== 3. Atualizar cada partida no Firestore =====
async function updateMatches() {
  const fixtures = await fetchFixtures();
  if (fixtures.length === 0) return;

  // Buscar todos os documentos atuais da coleção 'matches'
  const matchesSnapshot = await db.collection('matches').get();
  const existingMatches = {};
  matchesSnapshot.forEach(doc => {
    existingMatches[doc.id] = doc.data();
  });

  let updatedCount = 0;
  let notFoundCount = 0;

  for (const fixture of fixtures) {
    const apiHome = fixture.teams.home.name;
    const apiAway = fixture.teams.away.name;
    const homeTeam = normalizeTeamName(apiHome);
    const awayTeam = normalizeTeamName(apiAway);

    // Tentar encontrar o documento existente comparando os nomes dos times
    // Como os IDs atuais são do tipo "A_Mexico_vs_South_Africa", faremos uma busca flexível
    let matchId = null;
    for (const [id, data] of Object.entries(existingMatches)) {
      if ((data.homeTeam === homeTeam && data.awayTeam === awayTeam) ||
          (data.homeTeam === awayTeam && data.awayTeam === homeTeam)) {
        matchId = id;
        break;
      }
    }

    if (!matchId) {
      console.warn(`⚠️ Jogo não encontrado no Firestore: ${homeTeam} x ${awayTeam}`);
      notFoundCount++;
      continue;
    }

    // Extrair dados da API
    const date = fixture.fixture.date.split('T')[0];
    const time = fixture.fixture.time;
    const stadium = fixture.fixture.venue.name;
    const startTime = fixture.fixture.date; // ISO string

    // Dados para atualização (apenas os campos que queremos corrigir)
    const updateData = {
      date,
      time,
      stadium,
      startTime,
      // Opcional: corrigir os nomes dos times (caso estejam diferentes)
      homeTeam,
      awayTeam,
      // Preservar os campos que NÃO devem ser alterados:
      // homeScore, awayScore, status, round, group, id
    };

    try {
      await db.collection('matches').doc(matchId).update(updateData);
      console.log(`✅ Atualizado: ${homeTeam} x ${awayTeam} (${date} ${time})`);
      updatedCount++;
    } catch (err) {
      console.error(`❌ Erro ao atualizar ${matchId}:`, err.message);
    }
  }

  console.log(`\n🎉 Resumo: ${updatedCount} jogos atualizados, ${notFoundCount} não encontrados.`);
}

// Executar
updateMatches().catch(console.error);