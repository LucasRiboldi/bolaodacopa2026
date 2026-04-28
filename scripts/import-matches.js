const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const serviceAccountPath = path.join(__dirname, "serviceAccountKey.json");
const matchesPath = path.join(__dirname, "matches-data.json");

let serviceAccount;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} else if (fs.existsSync(serviceAccountPath)) {
  serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));
} else {
  console.error("Nenhuma credencial do Firebase encontrada.");
  process.exit(1);
}

if (!fs.existsSync(matchesPath)) {
  console.error("Arquivo matches-data.json nao encontrado em:", matchesPath);
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const matches = JSON.parse(fs.readFileSync(matchesPath, "utf8"));

async function importMatches() {
  if (!Array.isArray(matches)) {
    throw new Error("matches-data.json precisa conter um array.");
  }

  let batch = db.batch();
  let count = 0;

  for (const match of matches) {
    if (!match.id) {
      continue;
    }

    batch.set(db.collection("matches").doc(match.id), match, { merge: true });
    count += 1;

    if (count % 500 === 0) {
      await batch.commit();
      batch = db.batch();
    }
  }

  if (count % 500 !== 0) {
    await batch.commit();
  }

  console.log(`Importacao concluida: ${count} jogos processados.`);
}

importMatches().catch((error) => {
  console.error("Erro ao importar jogos:", error.message);
  process.exit(1);
});
