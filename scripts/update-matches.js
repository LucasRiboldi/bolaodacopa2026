// scripts/update-matches.js
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Carrega a chave de serviço do arquivo local
const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ Arquivo serviceAccountKey.json não encontrado em:', serviceAccountPath);
  console.error('   Baixe a chave no Firebase Console e coloque na pasta scripts/');
  process.exit(1);
}
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

const dataPath = path.join(__dirname, 'matches-data.json');
const matches = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

async function importMatches() {
  console.log(`🚀 Importando ${matches.length} jogos...`);
  let batch = db.batch();
  let count = 0;
  let commitCount = 0;

  for (const match of matches) {
    const docRef = db.collection('matches').doc(match.id);
    batch.set(docRef, match, { merge: true });
    count++;

    if (count % 500 === 0) {
      await batch.commit();
      console.log(`✅ Lote ${++commitCount} commitado (${count} documentos)`);
      batch = db.batch();
    }
  }

  if (count % 500 !== 0) {
    await batch.commit();
    console.log(`✅ Último lote commitado (${count} documentos)`);
  }

  console.log('🎉 Importação concluída com sucesso!');
}

importMatches().catch(console.error);