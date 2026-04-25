# ⚽🏆 Bolão Copa do Mundo 2026

### *Chute o placar, suba no ranking e prove que você entende mais que o comentarista da TV!* 🎙️🔥

<p align="center">
  <img src="./assets/badge-live.gif" height="28" />
  <img src="./assets/badge-ranking.gif" height="28" />
  <img src="./assets/badge-serverless.gif" height="28" />
</p>

---

## 🎬 Demo

<p align="center">
  <img src="./assets/demo.gif" alt="Demonstração do sistema" width="800"/>
</p>

---

## 🎯 Sobre o projeto

O **Bolão Copa 2026** é uma aplicação web **100% serverless**, gratuita e responsiva, criada pra transformar qualquer grupo de amigos em uma competição digna de final de Copa.

> 💡 *Aqui não ganha quem torce melhor — ganha quem chuta melhor.*

---

## ✨ Funcionalidades

* 🔐 Login com Google ou e-mail/senha
* 📊 Palpites para os **72 jogos da fase de grupos**
* 🏆 Classificação dos grupos (1º e 2º)
* 🔥 Mata-mata completo (oitavas → final + 3º lugar)
* 🎯 Sistema de pontuação com bônus
* 📈 Ranking automático em tempo real
* 🛠️ Painel administrativo completo
* 📱 Layout totalmente responsivo
* 🔄 Integração opcional com API de futebol

---

## 🧠 Diferenciais

* ⚡ Zero backend tradicional
* 💸 Funciona no plano gratuito
* 🔥 Dados em tempo real
* 🧩 Código simples e escalável
* 🤝 Fácil de contribuir

---

## 🧰 Stack Tecnológica

| Tecnologia       | Função          |
| ---------------- | --------------- |
| React + Vite     | Frontend        |
| Firebase Auth    | Autenticação    |
| Firestore        | Banco de dados  |
| Firebase Hosting | Deploy          |
| GitHub Actions   | CI/CD           |
| API-Football     | Dados dos jogos |
| Flagpedia        | Bandeiras       |

---

## 🚀 Instalação

### 🔧 Pré-requisitos

* Node.js 18+
* Conta no Firebase

---

### 📥 Clone o repositório

```bash
git clone https://github.com/LucasRiboldi/bolao-2026.git
cd bolao-2026/client
```

---

### ⚙️ Configuração

```bash
cp .env.example .env
```

Edite o `.env`:

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_API_FOOTBALL_KEY=... # opcional
```

---

### ▶️ Rodar o projeto

```bash
npm install
npm run dev
```

Acesse: http://localhost:5173

---

## 👑 Admin (modo avançado)

1. Faça login
2. Copie seu UID no Firebase
3. Crie coleção `admins` no Firestore
4. Adicione seu UID

---

## 📦 Estrutura do projeto

```
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
```

---

## 🧪 Qualidade

* ✅ ESLint configurado
* ✅ Commits semânticos
* ✅ Hooks modernos
* ✅ Build otimizada

---

## 🔒 Segurança

* 🔐 Autenticação Firebase
* 🛡️ Regras no Firestore
* 🚫 Sem exposição de segredos
* 🔒 HTTPS automático

---

## 🚀 Deploy

```bash
npm run build
firebase deploy
```

---

## 📈 Roadmap

* 🌙 Dark Mode
* 📊 Gráficos de evolução
* 🔔 Notificações push
* 📱 PWA
* 📤 Exportar dados
* 📸 Compartilhar ranking
* ⚡ Skeleton loading
* 💬 Toasts

---

## 🤝 Contribuição

```bash
git checkout -b feature/minha-feature
git commit -m "feat: nova feature"
git push origin feature/minha-feature
```

Abra um Pull Request 🚀

---

## 💡 Dicas para contribuidores

* Use commits claros
* Teste antes de subir
* Comece por pequenas melhorias
* Evite mudanças gigantes

---

## 📄 Licença

MIT

---

## 🙏 Créditos

* Firebase
* React
* API-Football
* Flagpedia

---

## 🧉 Autor

Feito por **Lucas Riboldi**

---

## 🏁 Final

> “No futebol e no código, todo mundo acha que sabe… até rodar em produção.” 😅

---

## 📎 Quick Start

```bash
git clone repo
cd client
npm install
npm run dev
```

---

🔥 Agora é só subir pro GitHub e chamar a galera!
