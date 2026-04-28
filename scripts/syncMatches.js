const admin = require("firebase-admin");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const API_KEY = process.env.API_FOOTBALL_KEY;

if (!API_KEY) {
  console.error("API_FOOTBALL_KEY nao configurada.");
  process.exit(1);
}

let serviceAccount;
const serviceAccountPath = path.join(__dirname, "serviceAccountKey.json");

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } catch (error) {
    console.error("Erro ao interpretar FIREBASE_SERVICE_ACCOUNT:", error.message);
    process.exit(1);
  }
} else if (fs.existsSync(serviceAccountPath)) {
  serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));
} else {
  console.error("Nenhuma credencial do Firebase encontrada.");
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const TEAM_NAME_MAP = {
  "United States": "USA",
  "Korea Republic": "South Korea",
  Czechia: "Czech Republic",
  "Bosnia-Herzegovina": "Bosnia and Herzegovina",
  "Cote d'Ivoire": "Ivory Coast",
  "Cape Verde Islands": "Cape Verde",
  "DR Congo": "DR Congo",
  Curacao: "Curacao",
};

const GROUPS = {
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

const normalizeTeamName = (apiName) => TEAM_NAME_MAP[apiName] || apiName;

const getGroupByTeam = (teamName) => {
  for (const [group, teams] of Object.entries(GROUPS)) {
    if (teams.includes(teamName)) {
      return group;
    }
  }

  return null;
};

const resolveRound = (roundName = "") => {
  if (roundName.includes("Round of 16")) return "round16";
  if (roundName.includes("Quarter")) return "quarter";
  if (roundName.includes("Semi")) return "semi";
  if (roundName.includes("Final")) return "final";
  return "group";
};

async function syncMatches() {
  console.log("Buscando jogos da Copa 2026 via API-FOOTBALL...");

  try {
    const response = await axios.get("https://v3.football.api-sports.io/fixtures", {
      headers: { "x-apisports-key": API_KEY },
      params: { league: 1, season: 2026 },
    });

    const fixtures = response.data?.response ?? [];
    if (fixtures.length === 0) {
      console.log("Nenhum jogo encontrado para a temporada 2026.");
      return;
    }

    const batch = db.batch();
    let updatedCount = 0;
    let skippedCount = 0;

    for (const fixture of fixtures) {
      const homeTeam = normalizeTeamName(fixture.teams?.home?.name);
      const awayTeam = normalizeTeamName(fixture.teams?.away?.name);
      const round = resolveRound(fixture.league?.round);
      const group = round === "group"
        ? getGroupByTeam(homeTeam) || getGroupByTeam(awayTeam)
        : null;

      if (round === "group" && !group) {
        skippedCount += 1;
        continue;
      }

      const id = (round === "group"
        ? `${group}_${homeTeam}_vs_${awayTeam}`
        : `${round}_${homeTeam}_vs_${awayTeam}`).replace(/\s/g, "_");

      batch.set(db.collection("matches").doc(id), {
        id,
        round,
        group,
        homeTeam,
        awayTeam,
        homeScore: fixture.goals?.home ?? null,
        awayScore: fixture.goals?.away ?? null,
        date: fixture.fixture?.date?.split("T")[0] ?? null,
        time: fixture.fixture?.date
          ? new Date(fixture.fixture.date).toISOString().slice(11, 16)
          : null,
        stadium: fixture.fixture?.venue?.name ?? "A definir",
        startTime: fixture.fixture?.date ?? null,
        status: fixture.fixture?.status?.long || "Not Started",
      }, { merge: true });

      updatedCount += 1;
    }

    await batch.commit();
    console.log(`Sincronizacao concluida: ${updatedCount} jogos atualizados, ${skippedCount} ignorados.`);
  } catch (error) {
    console.error("Erro na sincronizacao:", error.message);
    if (error.response?.data) {
      console.error(error.response.data);
    }
    process.exit(1);
  }
}

syncMatches();
