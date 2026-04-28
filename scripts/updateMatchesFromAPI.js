const admin = require("firebase-admin");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const serviceAccountPath = path.join(__dirname, "serviceAccountKey.json");
const apiKey = process.env.API_FOOTBALL_KEY;

if (!apiKey) {
  console.error("API_FOOTBALL_KEY nao configurada.");
  process.exit(1);
}

if (!fs.existsSync(serviceAccountPath)) {
  console.error("Arquivo da chave do Firebase nao encontrado em:", serviceAccountPath);
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const TEAM_NAME_MAP = {
  "United States": "USA",
  "Korea Republic": "South Korea",
  Czechia: "Czech Republic",
  "Bosnia-Herzegovina": "Bosnia and Herzegovina",
  "DR Congo": "DR Congo",
  "Cote d'Ivoire": "Ivory Coast",
  Curacao: "Curacao",
  "Cape Verde Islands": "Cape Verde",
};

const normalizeTeamName = (apiName) => TEAM_NAME_MAP[apiName] || apiName;

async function fetchFixtures() {
  const response = await axios.get("https://v3.football.api-sports.io/fixtures", {
    headers: { "x-apisports-key": apiKey },
    params: {
      league: 1,
      season: 2026,
    },
  });

  return response.data?.response ?? [];
}

async function updateMatches() {
  const fixtures = await fetchFixtures();
  if (fixtures.length === 0) {
    console.log("Nenhum jogo recebido da API.");
    return;
  }

  const matchesSnapshot = await db.collection("matches").get();
  const existingMatches = {};
  matchesSnapshot.forEach((matchDoc) => {
    existingMatches[matchDoc.id] = matchDoc.data();
  });

  let updatedCount = 0;
  let notFoundCount = 0;

  for (const fixture of fixtures) {
    const homeTeam = normalizeTeamName(fixture.teams?.home?.name);
    const awayTeam = normalizeTeamName(fixture.teams?.away?.name);

    let matchId = null;
    for (const [id, match] of Object.entries(existingMatches)) {
      if (match.homeTeam === homeTeam && match.awayTeam === awayTeam) {
        matchId = id;
        break;
      }
    }

    if (!matchId) {
      console.warn(`Jogo nao encontrado no Firestore: ${homeTeam} x ${awayTeam}`);
      notFoundCount += 1;
      continue;
    }

    await db.collection("matches").doc(matchId).update({
      date: fixture.fixture?.date?.split("T")[0] ?? null,
      time: fixture.fixture?.date
        ? new Date(fixture.fixture.date).toISOString().slice(11, 16)
        : null,
      stadium: fixture.fixture?.venue?.name ?? "A definir",
      startTime: fixture.fixture?.date ?? null,
      homeTeam,
      awayTeam,
    });

    updatedCount += 1;
  }

  console.log(`Resumo: ${updatedCount} jogos atualizados, ${notFoundCount} nao encontrados.`);
}

updateMatches().catch((error) => {
  console.error("Erro ao atualizar jogos:", error.message);
  process.exit(1);
});
