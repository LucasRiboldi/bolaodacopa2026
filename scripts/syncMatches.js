// scripts/syncMatches.js
const admin = require('firebase-admin');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// ================== CONFIGURAÇÕES ==================
const API_KEY = 'a43dd2c524991ea0a580de75b369596e'; // Sua chave da API-FOOTBALL

// ================== CARREGAR CREDENCIAIS DO FIREBASE ==================
let serviceAccount;

// Tenta carregar do arquivo local primeiro
const filePath = path.join(__dirname, 'serviceAccountKey.json');
if (fs.existsSync(filePath)) {
  try {
    serviceAccount = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    console.log('✅ Credenciais carregadas do arquivo serviceAccountKey.json');
  } catch (err) {
    console.error('❌ Erro ao ler serviceAccountKey.json:', err.message);
    process.exit(1);
  }
} 
// Se não houver arquivo, tenta a variável de ambiente
else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    console.log('✅ Credenciais carregadas da variável FIREBASE_SERVICE_ACCOUNT');
  } catch (err) {
    console.error('❌ Erro ao parsear FIREBASE_SERVICE_ACCOUNT:', err.message);
    process.exit(1);
  }
} 
else {
  console.error('❌ Nenhuma credencial encontrada.');
  console.error('   Opção 1: Baixe o arquivo serviceAccountKey.json do Firebase Console e coloque na pasta "scripts/".');
  console.error('   Opção 2: Defina a variável de ambiente FIREBASE_SERVICE_ACCOUNT com o JSON da chave de serviço.');
  process.exit(1);
}

// Inicializa o Firebase Admin
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

// ================== MAPEAMENTO DE NOMES ==================
const teamNameMap = {
  "United States": "USA",
  "Korea Republic": "South Korea",
  "Czechia": "Czech Republic",
  "Bosnia-Herzegovina": "Bosnia and Herzegovina",
  "Côte d'Ivoire": "Ivory Coast",
  "Cape Verde Islands": "Cape Verde",
  "DR Congo": "DR Congo",
  "Curacao": "Curacao",
};

function normalize(apiName) {
  return teamNameMap[apiName] || apiName;
}

// ================== GRUPOS ==================
const groups = {
  A: ["Mexico", "South Africa", "South Korea", "Czech Republic"],
  B: ["Canada", "Bosnia and Herzegovina", "Qatar", "Switzerland"],
  C: ["Brazil", "Morocco", "Haiti", "Scotland"],
  D: ["USA", "Australia", "Paraguay", "Turkey"],
  E: ["Germany", "Curacao", "Ivory Coast", "Ecuador"],
  F: ["Netherlands", "Japan", "Tunisia", "Sweden"],
  G: ["Belgium", "Iran", "Egypt", "New Zealand"],
  H: ["Spain", "Uruguay", "Saudi Arabia", "Cape Verde"],
  I: ["France", "Senegal", "Norway", "Iraq"],
  J: ["Argentina", "Austria", "Algeria", "Jordan"],
  K: ["Portugal", "Colombia", "Uzbekistan", "DR Congo"],
  L: ["England", "Croatia", "Panama", "Ghana"],
};

function getGroupByTeam(teamName) {
  for (const [group, teams] of Object.entries(groups)) {
    if (teams.includes(teamName)) return group;
  }
  return null;
}

// ================== SINCRONIZAÇÃO PRINCIPAL ==================
async function syncMatches() {
  console.log('🚀 Buscando jogos da Copa 2026 via API-FOOTBALL...');
  try {
    const response = await axios.get('https://v3.football.api-sports.io/fixtures', {
      headers: { 'x-apisports-key': API_KEY },
      params: { league: 1, season: 2026 }
    });
    const fixtures = response.data.response;
    if (!fixtures.length) {
      console.log('⚠️ Nenhum jogo encontrado para a temporada 2026.');
      return;
    }
    console.log(`📋 Encontrados ${fixtures.length} jogos.`);

    const batch = db.batch();
    let updatedCount = 0;
    let skippedCount = 0;

    for (const fixture of fixtures) {
      let homeTeam = normalize(fixture.teams.home.name);
      let awayTeam = normalize(fixture.teams.away.name);
      const homeGroup = getGroupByTeam(homeTeam);
      const awayGroup = getGroupByTeam(awayTeam);

      if (!homeGroup && !awayGroup) {
        console.warn(`⚠️ Ambos os times sem grupo: ${homeTeam} x ${awayTeam} – ignorado.`);
        skippedCount++;
        continue;
      }

      const group = homeGroup || awayGroup;
      let round = "group";
      const roundName = fixture.league.round || "";
      if (roundName.includes("Round of 16")) round = "round16";
      else if (roundName.includes("Quarter")) round = "quarter";
      else if (roundName.includes("Semi")) round = "semi";
      else if (roundName.includes("Final")) round = "final";

      const id = round === "group"
        ? `${group}_${homeTeam}_vs_${awayTeam}`.replace(/\s/g, '_')
        : `${round}_${homeTeam}_vs_${awayTeam}`.replace(/\s/g, '_');

      const matchData = {
        id,
        round,
        group: round === "group" ? group : null,
        homeTeam,
        awayTeam,
        homeScore: fixture.goals.home ?? null,
        awayScore: fixture.goals.away ?? null,
        date: fixture.fixture.date.split('T')[0],
        time: fixture.fixture.time,
        stadium: fixture.fixture.venue.name,
        startTime: fixture.fixture.date,
        status: fixture.fixture.status.long || "Not Started",
      };

      batch.set(db.collection('matches').doc(id), matchData, { merge: true });
      updatedCount++;
    }

    await batch.commit();
    console.log(`✅ Sincronização concluída: ${updatedCount} jogos processados, ${skippedCount} ignorados.`);
  } catch (error) {
    console.error('❌ Erro na sincronização:', error.message);
    if (error.response) console.error(error.response.data);
  }
}

syncMatches();