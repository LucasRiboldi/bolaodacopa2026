// src/utils/scoringEngine.js
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { groups } from "./groupConfig";

/**
 * Busca a configuração de pontuação do Firestore
 */
async function getScoringConfig() {
  const configDoc = await getDoc(doc(db, "config", "scoring"));
  if (configDoc.exists()) {
    return configDoc.data();
  }
  // Valores padrão caso não exista configuração
  return {
    exactScore: 6,
    correctResult: 2,
    twoCorrectClassified: 5,
    oneCorrectClassified: 2,
    correctOrderBonus: 3,
    // FUTURO: round16: 4, quarter: 6, semi: 10, finalWinner: 12,
    // semiFinalistEach: 5, finalistEach: 7, champion: 12
  };
}

/**
 * Calcula a classificação real dos grupos com base nos jogos finalizados
 */
async function getRealGroupOrder() {
  const matchesSnap = await getDocs(collection(db, "matches"));
  const groupStats = {};

  // Inicializa estatísticas para cada time em cada grupo
  for (const [group, teams] of Object.entries(groups)) {
    groupStats[group] = {};
    teams.forEach(team => {
      groupStats[group][team] = {
        played: 0, wins: 0, draws: 0, losses: 0,
        goalsFor: 0, goalsAgainst: 0, points: 0
      };
    });
  }

  // Processa jogos finalizados da fase de grupos
  matchesSnap.forEach(doc => {
    const match = doc.data();
    if (match.round === "group" && match.group && match.homeScore !== null && match.awayScore !== null) {
      const g = groupStats[match.group];
      if (g && g[match.homeTeam] && g[match.awayTeam]) {
        const home = match.homeTeam, away = match.awayTeam;
        const hs = match.homeScore, as = match.awayScore;

        g[home].played++; g[away].played++;
        g[home].goalsFor += hs; g[home].goalsAgainst += as;
        g[away].goalsFor += as; g[away].goalsAgainst += hs;

        if (hs > as) {
          g[home].wins++; g[away].losses++;
          g[home].points += 3;
        } else if (as > hs) {
          g[away].wins++; g[home].losses++;
          g[away].points += 3;
        } else {
          g[home].draws++; g[away].draws++;
          g[home].points += 1;
          g[away].points += 1;
        }
      }
    }
  });

  // Ordena e retorna a ordem real (primeiro e segundo colocados)
  const realOrder = {};
  for (const group in groupStats) {
    const teams = Object.entries(groupStats[group]).map(([name, stats]) => ({
      name,
      ...stats,
      goalDifference: stats.goalsFor - stats.goalsAgainst
    }));
    teams.sort((a, b) => {
      if (a.points !== b.points) return b.points - a.points;
      if (a.goalDifference !== b.goalDifference) return b.goalDifference - a.goalDifference;
      return b.goalsFor - a.goalsFor;
    });
    realOrder[group] = teams.map(t => t.name);
  }
  return realOrder;
}

/**
 * Calcula a pontuação de um usuário específico
 * @param {string} userId - UID do usuário
 * @returns {Promise<{total: number, details: object}>}
 */
export async function calculateUserScore(userId) {
  const scoring = await getScoringConfig();
  const realGroupOrder = await getRealGroupOrder();

  let totalPoints = 0;
  let exactHits = 0;
  let resultHits = 0;
  let groupPoints = 0;

  // 1. Buscar palpites de placar do usuário
  const predictionsSnap = await getDocs(collection(db, "predictions"));
  const userPredictions = [];
  predictionsSnap.forEach(doc => {
    const data = doc.data();
    if (data.userId === userId) userPredictions.push(data);
  });

  // Buscar todos os jogos para comparar resultados reais
  const matchesSnap = await getDocs(collection(db, "matches"));
  const matchesMap = new Map();
  matchesSnap.forEach(doc => {
    const m = doc.data();
    matchesMap.set(doc.id, m);
  });

  for (const pred of userPredictions) {
    const match = matchesMap.get(pred.matchId);
    if (!match || match.homeScore === null || match.awayScore === null) continue;

    let pts = 0;
    if (pred.homeScore === match.homeScore && pred.awayScore === match.awayScore) {
      pts = scoring.exactScore;
      exactHits++;
    } else {
      const predWinner = pred.homeScore > pred.awayScore ? "home" : pred.homeScore < pred.awayScore ? "away" : "draw";
      const realWinner = match.homeScore > match.awayScore ? "home" : match.homeScore < match.awayScore ? "away" : "draw";
      if (predWinner === realWinner) {
        pts = scoring.correctResult;
        resultHits++;
      }
    }
    totalPoints += pts;
  }

  // 2. Palpites de classificação dos grupos
  const groupPredSnap = await getDocs(collection(db, "groupPredictions"));
  for (const doc of groupPredSnap.docs) {
    const idParts = doc.id.split("_");
    if (idParts[0] !== userId) continue;
    const group = idParts[1];
    const data = doc.data();
    const userOrder = [data.first, data.second];
    const realOrder = realGroupOrder[group] || [];

    let correct = 0;
    if (userOrder[0] && realOrder.includes(userOrder[0])) correct++;
    if (userOrder[1] && realOrder.includes(userOrder[1])) correct++;

    let pts = 0;
    if (correct === 2) pts = scoring.twoCorrectClassified;
    else if (correct === 1) pts = scoring.oneCorrectClassified;

    // Bônus por ordem correta (apenas se acertou os dois e na ordem exata)
    if (correct === 2 && userOrder[0] === realOrder[0] && userOrder[1] === realOrder[1]) {
      pts += scoring.correctOrderBonus;
    }
    totalPoints += pts;
    groupPoints += pts;
  }

  // FUTURO: adicionar pontuação de mata‑mata e bônus aqui

  return {
    total: totalPoints,
    details: {
      exact: exactHits,
      result: resultHits,
      group: groupPoints,
      // knockout: 0, bonus: 0 (futuro)
    }
  };
}

/**
 * Calcula a pontuação para todos os usuários (útil para o admin)
 * @returns {Promise<Map<string, {total: number, details: object}>>}
 */
export async function calculateAllScores() {
  const usersSnap = await getDocs(collection(db, "users"));
  const scoresMap = new Map();
  for (const userDoc of usersSnap.docs) {
    const userId = userDoc.id;
    const score = await calculateUserScore(userId);
    scoresMap.set(userId, score);
  }
  return scoresMap;
}