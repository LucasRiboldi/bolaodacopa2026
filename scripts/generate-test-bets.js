// scripts/generate-test-bets.js
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Carrega a chave de serviço
const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ Arquivo serviceAccountKey.json não encontrado em', serviceAccountPath);
  process.exit(1);
}
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();
const auth = admin.auth();

// ===== CONFIGURAÇÃO DOS USUÁRIOS DE TESTE =====
// Você pode usar UIDs reais (de usuários já criados) ou criar novos via Admin SDK.
// Para simplificar, usaremos UIDs fictícios e também criaremos contas de autenticação.
const testUsers = [
  { email: "majest2017+teste1@gmail.com", password: "teste1", displayName: "João Teste" },
  { email: "majest2017+teste2@gmail.com", password: "teste2", displayName: "Maria Teste" },
];

// ===== FUNÇÃO PARA CRIAR USUÁRIOS (AUTH + FIRESTORE) =====
async function createUsers() {
  const created = [];
  for (const user of testUsers) {
    try {
      const userRecord = await auth.createUser({
        email: user.email,
        password: user.password,
        displayName: user.displayName,
      });
      // Cria documento na coleção 'users'
      await db.collection('users').doc(userRecord.uid).set({
        email: user.email,
        displayName: user.displayName,
        createdAt: new Date().toISOString(),
      });
      console.log(`✅ Usuário criado: ${user.displayName} (${userRecord.uid})`);
      created.push(userRecord.uid);
    } catch (error) {
      // Se o usuário já existir, buscamos o UID existente
      if (error.code === 'auth/email-already-exists') {
        const userRecord = await auth.getUserByEmail(user.email);
        console.log(`⚠️ Usuário já existe: ${user.displayName} (${userRecord.uid})`);
        created.push(userRecord.uid);
      } else {
        console.error(`❌ Erro ao criar ${user.email}:`, error.message);
      }
    }
  }
  return created;
}

// ===== GERAR PALPITES DE PLACAR (FASE DE GRUPOS) =====
async function generateGroupBets(uid) {
  const matchesSnap = await db.collection('matches').where('round', '==', 'group').get();
  let count = 0;
  for (const docSnap of matchesSnap.docs) {
    const match = docSnap.data();
    // Palpite aleatório entre 0 e 5 gols
    const homeScore = Math.floor(Math.random() * 6);
    const awayScore = Math.floor(Math.random() * 6);
    const predId = `${uid}_${docSnap.id}`;
    await db.collection('predictions').doc(predId).set({
      userId: uid,
      matchId: docSnap.id,
      homeScore,
      awayScore,
      updatedAt: new Date().toISOString(),
    });
    count++;
  }
  console.log(`   🎲 ${count} palpites de jogos gerados para ${uid}`);
}

// ===== GERAR CLASSIFICAÇÃO DOS GRUPOS =====
async function generateGroupClassification(uid) {
  // Grupos (copiados do groupConfig.js)
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
  for (const [group, teams] of Object.entries(groups)) {
    // Escolhe dois times aleatórios (primeiro e segundo lugares)
    const shuffled = [...teams];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const first = shuffled[0];
    const second = shuffled[1];
    await db.collection('groupPredictions').doc(`${uid}_${group}`).set({
      first,
      second,
    });
  }
  console.log(`   🏆 Classificação de grupos gerada para ${uid}`);
}

// ===== GERAR PALPITES DE MATA‑MATA =====
async function generateKnockoutBets(uid) {
  // Buscar todos os jogos eliminatórios
  const matchesSnap = await db.collection('matches').where('round', 'in', ['round16', 'quarter', 'semi', 'final']).get();
  const predictions = {};
  for (const docSnap of matchesSnap.docs) {
    const match = docSnap.data();
    // Escolhe um vencedor aleatório entre os dois times (se ambos forem TBD, pula)
    if (match.homeTeam !== "TBD" && match.awayTeam !== "TBD") {
      const winner = Math.random() < 0.5 ? match.homeTeam : match.awayTeam;
      predictions[match.id] = { winner };
    } else {
      predictions[match.id] = { winner: null };
    }
  }
  await db.collection('knockoutPredictions').doc(uid).set(predictions);
  console.log(`   🥊 Palpites de mata‑mata gerados para ${uid}`);
}

// ===== GERAR BÔNUS =====
async function generateBonus(uid) {
  // Lista de todos os times das fases de grupos
  const allTeams = Object.values({
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
  }).flat();

  // Escolhe 4 semifinalistas aleatórios
  const shuffled = [...allTeams];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const semifinalists = shuffled.slice(0, 4);
  // Escolhe 2 finalistas dentre os semifinalistas
  const finalists = semifinalists.slice(0, 2);
  // Escolhe um campeão dentre os finalistas
  const champion = finalists[Math.floor(Math.random() * finalists.length)];

  await db.collection('bonusPredictions').doc(uid).set({
    semifinalists,
    finalists,
    champion,
  });
  console.log(`   🎁 Bônus gerados para ${uid}`);
}

// ===== FUNÇÃO PRINCIPAL =====
async function main() {
  console.log("🚀 Iniciando geração de dados de teste...");
  const uids = await createUsers();
  for (const uid of uids) {
    console.log(`\n📝 Processando usuário ${uid}`);
    await generateGroupBets(uid);
    await generateGroupClassification(uid);
    await generateKnockoutBets(uid);
    await generateBonus(uid);
  }
  console.log("\n🎉 Geração de apostas de teste concluída!");
  console.log("💡 Agora execute o cálculo do ranking no painel admin para ver a pontuação.");
}

main().catch(console.error);