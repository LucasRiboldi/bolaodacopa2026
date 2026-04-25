⚽🏆 Bolão Copa do Mundo 2026
Chute o placar, suba no ranking e prove que você entende mais que o comentarista da TV! 🎙️🔥
<p align="center"> <img src="https://img.shields.io/badge/status-em%20desenvolvimento-yellow?style=for-the-badge" /> <img src="https://img.shields.io/badge/licença-MIT-brightgreen?style=for-the-badge" /> <img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react" /> <img src="https://img.shields.io/badge/Firebase-Spark-FFCA28?style=for-the-badge&logo=firebase" /> <img src="https://img.shields.io/badge/Vite-fast-646CFF?style=for-the-badge&logo=vite" /> </p>
🎯 Sobre o projeto

O Bolão Copa 2026 é uma aplicação web 100% serverless, gratuita e responsiva, criada pra transformar qualquer grupo de amigos em uma competição digna de final de Copa.

💡 Aqui não ganha quem torce melhor — ganha quem chuta melhor.

✨ Features que fazem esse projeto brilhar
🔐 Autenticação simples (Google + e-mail/senha)
📊 Palpites completos dos jogos da fase de grupos (72 partidas!)
🏆 Previsão de classificação (1º e 2º colocados)
🔥 Mata-mata automático (doitavas até a final + 3º lugar)
🎯 Sistema de pontuação inteligente (placar + bônus estratégicos)
📈 Ranking em tempo real
🛠️ Painel Admin poderoso
📱 Design responsivo de verdade
🔄 Integração opcional com API de futebol
🧠 Diferenciais (o que deixa isso aqui bonito mesmo)
⚡ Zero backend tradicional (adeus servidor 🪦)
💸 Funciona 100% no plano gratuito do Firebase
🔥 Atualizações em tempo real (Firestore)
🧩 Arquitetura simples, escalável e open source
🧑‍💻 Fácil de contribuir (até pra quem está aprendendo)
🛠️ Stack Tecnológica
Tecnologia	Função
React + Vite	Interface moderna e rápida
Firebase Auth	Login seguro
Firestore	Banco em tempo real
Firebase Hosting	Deploy global
GitHub Actions	CI/CD automático
API-Football	Dados dos jogos
Flagpedia	Bandeiras
🚀 Começando (Setup rápido)
🔧 Pré-requisitos
Node.js 18+
Conta no Firebase
📥 Clone o projeto
git clone https://github.com/LucasRiboldi/bolao-2026.git
cd bolao-2026/client
⚙️ Configure o ambiente
cp .env.example .env

Edite com suas credenciais Firebase:

VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_API_FOOTBALL_KEY=... # opcional
▶️ Rode o projeto
npm install
npm run dev

Acesse: http://localhost:5173

👑 Como virar ADMIN (modo Deus ativado)
Faça login
Copie seu UID no Firebase Auth
Crie coleção admins no Firestore
Adicione um documento com seu UID

💥 Pronto — desbloqueou poderes supremos.

🧪 Boas práticas adotadas
✅ ESLint configurado
✅ Commits semânticos (feat, fix, etc.)
✅ Código com hooks modernos (sem legado)
✅ Variáveis sensíveis protegidas
✅ Estrutura organizada por domínio
🔒 Segurança
🔐 Autenticação via Firebase
🛡️ Regras de acesso no Firestore
🚫 Sem exposição de chaves sensíveis
🔒 HTTPS automático
📦 Estrutura do projeto
bolao-2026/
├── client/
│   ├── src/
│   │   ├── components/
│   │   ├── utils/
│   │   └── App.jsx
│   ├── public/
│   └── .env
├── scripts/
├── .github/workflows/
└── firebase.json
🚀 Deploy
npm run build
firebase deploy

Ou automático via GitHub Actions (já incluso).

📈 Roadmap (próximas features)
🌙 Dark Mode
📊 Gráficos de desempenho
🔔 Notificações push
📱 PWA (instalar como app)
📤 Exportar palpites
📸 Compartilhar ranking
⚡ Skeleton loading
💬 Toast notifications
🤝 Contribuindo

Quer ajudar? Chega mais:

git checkout -b feature/minha-feature
git commit -m "feat: minha feature"
git push origin feature/minha-feature

Depois é só abrir um PR 🚀

💡 Dicas para contribuidores
Comece por issues com label good first issue
Mantenha commits pequenos e claros
Teste antes de subir
Evite mexer em muitas coisas de uma vez
📄 Licença

MIT — use, modifique, contribua.

🙏 Créditos
Firebase 🔥
React ⚛️
API-Football ⚽
Flagpedia 🌍
🧉 Autor

Feito com café, código e discussões de futebol por Lucas Riboldi

🏁 Frase final

“No futebol e no código, todo mundo acha que sabe… até rodar em produção.” 😅

📎 TL;DR (pra quem não lê README 😆)
git clone repo
cd client
npm install
npm run dev