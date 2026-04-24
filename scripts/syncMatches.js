// scripts/syncMatches.js
require('dotenv').config();
const admin = require('firebase-admin');
const axios = require('axios');

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const API_KEY = process.env.API_FOOTBALL_KEY;
if (!API_KEY) {
  console.error('❌ API_FOOTBALL_KEY não definida');
  process.exit(1);
}


// Mapeamento de nomes
const teamNameMap = {
  "United States": "USA",
  "Korea Republic": "South Korea",
  "Czechia": "Czech Republic",
  "Bosnia-Herzegovina": "Bosnia and Herzegovina",
  "Côte d'Ivoire": "Ivory Coast",
  "Cape Verde Islands": "Cape Verde",
  "DR Congo": "DR Congo",
};
function normalize(apiName) {
  return teamNameMap[apiName] || apiName;
}

// Grupos (cópia do groupConfig.js para uso no backend)
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

async function syncMatches() {
  console.log('🚀 Buscando jogos da Copa 2026 via API-FOOTBALL...');
  try {
    const response = await axios.get('https://v3.football.api-sports.io/fixtures', {
      headers: { 'x-apisports-key': API_KEY },
      params: { league: 1, season: 2026 }
    });
    const fixtures = response.data.response;
    if (!fixtures.length) {
      console.log('⚠️ Nenhum jogo encontrado.');
      return;
    }
    console.log(`📋 Encontrados ${fixtures.length} jogos.`);
    const batch = db.batch();
    for (const fixture of fixtures) {
      const homeTeam = normalize(fixture.teams.home.name);
      const awayTeam = normalize(fixture.teams.away.name);
      const group = getGroupByTeam(homeTeam) || getGroupByTeam(awayTeam);
      if (!group) {
        console.warn(`⚠️ Grupo não encontrado para ${homeTeam} x ${awayTeam}`);
        continue;
      }
      const id = `${group}_${homeTeam}_vs_${awayTeam}`.replace(/\s/g, '_');
      const roundName = fixture.league.round || "";
      let round = "group";
      if (roundName.includes("Round of 16")) round = "round16";
      else if (roundName.includes("Quarter")) round = "quarter";
      else if (roundName.includes("Semi")) round = "semi";
      else if (roundName.includes("Final")) round = "final";

      const matchData = {
        id,
        round,
        group,
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
      const matchRef = db.collection('matches').doc(id);
      batch.set(matchRef, matchData, { merge: true });
    }
    await batch.commit();
    console.log('✅ Jogos sincronizados com sucesso!');
  } catch (error) {
    console.error('❌ Erro na sincronização:', error.message);
    if (error.response) console.error(error.response.data);
  }
}

syncMatches();