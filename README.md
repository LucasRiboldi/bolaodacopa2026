<!-- BANNER -->
<p align="center">
  <img src="https://via.placeholder.com/1200x300/0f172a/ffffff?text=Bolão+Copa+2026" alt="Bolão Copa 2026 Banner" />
</p>

<h1 align="center">🏆 Bolão Copa do Mundo 2026</h1>

<p align="center">
  <b>Chute o placar, suba no ranking e prove que você entende de futebol ⚽</b>
</p>

<p align="center">
  <a href="#-demo">Demo</a> •
  <a href="#-preview">Preview</a> •
  <a href="#-funcionalidades">Funcionalidades</a> •
  <a href="#-tecnologias">Tecnologias</a> •
  <a href="#-instalação">Instalação</a> •
  <a href="#-roadmap">Roadmap</a> •
  <a href="#-contribuição">Contribuição</a>
</p>

---

## 🚀 Demo

🔗 https://bolao2026-695ec.web.app/

---

## 📸 Preview

### 🏠 Tela inicial
<p align="center">
  <img src="https://via.placeholder.com/900x500?text=Home+Screen" width="80%" />
</p>

### 📊 Ranking
<p align="center">
  <img src="https://via.placeholder.com/900x500?text=Ranking" width="80%" />
</p>

### 🧾 Palpites
<p align="center">
  <img src="https://via.placeholder.com/900x500?text=Palpites" width="80%" />
</p>

---

## ✨ Funcionalidades

### ⚽ Sistema completo de bolão

- 🎯 Palpites para todos os jogos
- 🏆 Classificação de grupos
- 🔥 Mata-mata automático
- 🥇 Campeão + bônus
- 📊 Ranking em tempo real

---

### 🔐 Autenticação

- Login com Google
- Email e senha
- Firebase Auth

---

### 🛠 Administração

- Gerenciar jogos
- Editar resultados
- Recalcular ranking
- Importar dados JSON
- Sincronizar API

---

## 🧰 Tecnologias

<p align="center">

<img src="https://skillicons.dev/icons?i=react,vite,firebase,js,html,css,git" />

</p>

- React 18
- Vite
- Firebase (Auth + Firestore + Hosting)
- API-Football
- GitHub Actions

---

## ⚙️ Instalação – Passo a passo para colocar o bolão no ar (localmente)

Siga estas etapas com calma – em menos de 10 minutos seu bolão estará rodando no localhost.



```bash
# Clone o projeto
git clone https://github.com/LucasRiboldi/bolaodacopa2026.git

# Entre na pasta
cd bolaodacopa2026/client

# Instale dependências
npm install

# Rodar localmente
npm run dev
```

Você verá algo como:
```bash
  VITE v8.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

Abra http://localhost:5173 no seu navegador. Pronto, o bolão já está no ar! 🎉

---

## 📦 Estrutura

```bash
📦 root
├── 📂 .github
│   └── 📂 workflows
│       ├── 🚀 deploy.yml
│       └── 🔄 sync-matches.yml
│
├── 📂 client
│   ├── 📂 public
│   │   ├── 🖼 favicon.svg
│   │   ├── 🖼 icons.svg
│   │   └── 🏆 worldcup2026-logo.png
│   │
│   ├── 📂 src
│   │   ├── 📂 components
│   │   │   ├── 🧩 AdminPanel.jsx
│   │   │   ├── 🎯 BonusPredictions.jsx
│   │   │   ├── 🔐 EmailLogin.jsx
│   │   │   ├── 📊 GroupClassificationPicker.jsx
│   │   │   ├── 📅 GroupStageMatchesTable.jsx
│   │   │   ├── 📈 GroupStandings.jsx
│   │   │   ├── 🏆 KnockoutBracket.jsx
│   │   │   ├── ⚽ MatchCard.jsx
│   │   │   ├── 📋 Matches.jsx
│   │   │   ├── 🥇 Ranking.jsx
│   │   │   └── 👤 UserProfile.jsx
│   │   │
│   │   ├── 📂 utils
│   │   ├── ⚛️ App.jsx
│   │   ├── 🔥 firebase.js
│   │   ├── 🎨 index.css
│   │   └── 🚀 main.jsx
│   │
│   ├── ⚙️ .gitignore
│   ├── 🌐 index.html
│   ├── 📦 package.json
│   ├── 🔒 package-lock.json
│   └── ⚡ vite.config.js
│
├── 📂 scripts
│   ├── 🧪 generate-test-bets.js
│   ├── 🔄 syncMatches.js
│   ├── 🔄 update-matches.js
│   ├── 🌍 updateMatchesFromAPI.js
│   ├── 📦 package.json
│   └── 🔒 package-lock.json
│
├── 🔥 .firebaserc
├── ⚙️ .gitignore
├── 📘 README.md
├── 📝 Recomendações.txt
└── 🔐 firestore.rules
```

## 🧠 Organização
- client/ → Interface da aplicação (React + Vite)
- components/ → Componentes reutilizáveis da UI
- scripts/ → Scripts de automação e integração com API
- .github/workflows/ → CI/CD e automações (deploy + sync de dados)
- firebase → Configurações e regras de segurança

---

## 🔒 Segurança

- 🔐 Firebase Auth
- 📜 Firestore Rules
- 🔑 Variáveis protegidas (.env)
- 🌐 HTTPS

---

## 📋 🗺️ Roadmap de atualizações

- [ ] 🔥 Fase 0 – Correções imediatas
- - [ ] Corrigir a exibição da data dos jogos – garantir que startTime seja sempre uma data futura (a partir de 11/06/2026). Solução: Atualizar manualmente via script ou injetar dados corretos no matches-data.json.
- - [ ] Ajustar ordem mandante/visitante – verificar se a tabela de palpites está mostrando o time da casa sempre à esquerda. Solução: Validar com os dados da API‑FOOTBALL ou corrigir no JSON.
- - [ ] Desabilitar salvamento de palpites quando startTime for nulo – evitar que apostas sejam salvas sem data definida.
Solução: No frontend, comparar new Date(match.startTime) – se for Invalid Date, exibir mensagem e bloquear.
- - [ ] Tratar erro do Firebase Auth quando domínio não autorizado – adicionar localhost e domínio de produção nas configurações do Firebase.

- [ ] 🧪 Fase 1 – Estabilidade e experiência do usuário
- - [ ] Substituir alert() por toasts – usar react-hot-toast para feedbacks não intrusivos.
Benefício: Menos irritante, mais profissional.
- - [ ] Adicionar skeleton loading – esqueletos animados enquanto carrega jogos, ranking e perfil.
Exemplo: react-loading-skeleton.
- - [ ] Implementar salvamento automático – após o usuário digitar os palpites, salvar em background (debounce). Reduz a necessidade de clicar em "Salvar" toda hora.
- - [ ] Indicador visual de jogo bloqueado (já existe, mas melhorar) – mostrar um cadeado ou tooltip explicando “Jogo já começou”.
- - [ ] Validar campos de gols – não permitir valores negativos ou letras (já está type="number", mas reforçar).

- [ ] 🎨 Fase 2 – Melhorias visuais e responsividade
- - [ ] Modo escuro (dark mode) – adicionar toggle que altera as variáveis CSS.
Usar prefers-color-scheme e permitir escolha do usuário.
- - [ ] Animações suaves – transições em cards, efeito de hover em botões, fade‑in ao carregar.
- - [ ] Melhorar o layout do mata‑mata (bracket) – tornar as colunas mais compactas em telas pequenas (scroll horizontal amigável).
- - [ ] Adicionar tooltips – explicar regras de pontuação, como funciona a classificação dos grupos, etc.
- - [ ] Logo da Copa no header (já tem, mas centralizar) – ajustar posicionamento no mobile.

- [ ] 🧠 Fase 3 – Funcionalidades avançadas
- - [ ] Gráfico de evolução no perfil – exibir a pontuação do usuário ao longo dos dias/rodadas.
Biblioteca: recharts ou chart.js.
- - [ ] Modo de simulação – permitir que o administrador teste “E se o Brasil perder para a Argentina?” (impacto no ranking).
- - [ ] Compartilhamento do ranking – gerar uma imagem personalizada do ranking para postar em redes sociais (usando html-to-image).
- - [ ] Notificações push (Firebase Cloud Messaging) – avisar quando um jogo terminar ou quando o ranking for atualizado.
- - [ ] Exportar dados do usuário (GDPR) – botão para baixar todas as apostas e estatísticas em JSON/CSV.

- [ ] 🔁 Fase 4 – Automação e integração
- - [ ] Workflow de sincronização de resultados (GitHub Actions) já existe – testar e ajustar para rodar a cada 6 horas com a API‑FOOTBALL.
- - [ ] Atualização automática dos confrontos do mata‑mata – com base nos palpites de classificação de grupos, gerar as chaves das oitavas no próprio frontend (o código já faz isso, mas pode ser refinado).
- - [ ] Webhook para resultados reais – disparar uma função (ex: Firebase Function) que envia e‑mail para quem acertou o placar exato.
- - [ ] Cache do Firestore com persistência offline – habilitar enableIndexedDbPersistence para funcionar sem internet (leituras anteriores).

- [ ] 🛡️ Fase 5 – Segurança e escalabilidade
- - [ ] Rate limiting nas operações de escrita (Firestore regras) – impedir que um usuário faça muitas apostas em pouco tempo.
- - [ ] Auditoria de ações do administrador – criar coleção logs para registrar quem alterou resultados ou configurações.
- - [ ] Backup automático do Firestore – exportar dados periodicamente para o Google Cloud Storage (gratuito até 5 GB/mês).
- - [ ] Monitoramento de erros – integrar com Sentry (plano gratuito) para capturar exceções no frontend.

- [ ] 🧪 Fase 6 – Testes e documentação
- - [ ] Testes unitários (Jest + React Testing Library) – cobrir componentes críticos (Matches, Ranking, AdminPanel).
- - [ ] Testes de integração – simular fluxo de login, aposta e cálculo de ranking.
- - [ ] Documentação completa da API (Firestore esquemas) – listar todas as coleções, campos e regras.
- - [ ] Guia de contribuição (CONTRIBUTING.md) e código de conduta.
- - [ ] Vídeo demonstrativo – gravar um tutorial rápido de como rodar o projeto e usar o painel admin.

- [ ] 🚀 Fase 7 – Deploy contínuo e monitoramento
- - [ ] Configurar ambiente de staging – deploy em projeto Firebase separado para testar antes de ir para produção.
- - [ ] Monitoramento de desempenho – usar o próprio Firebase Performance (gratuito) para identificar lentidão.
- - [ ] Configurar domínio personalizado (ex: bolaocopa2026.com.br) – isso exige um plano pago do Firebase Hosting (mas o projeto pode ficar no .web.app sem custo).

- [ ] Ideias extras (para o futuro distante)
- - [ ] Sistema de ligas privadas – criar grupos fechados onde os amigos competem entre si.
- - [ ] Palpites de posse de bola, cartões, escanteios (mais complexo, exigiria outra API).
- - [ ] Chat integrado (Firebase Realtime Database) para a galera zoar em tempo real.
- - [ ] Versão mobile nativa (React Native) – reutilizar a lógica do Firestore e autenticação.

---

## 🤝 Contribuição

```bash
git checkout -b feature/minha-feature
git commit -m "feat: nova feature"
git push origin feature/minha-feature
```

Abra um Pull Request 🚀

---

## 📄 Licença

Este projeto está sob a licença MIT, permitindo uso, modificação e distribuição livre do código.

---

## 🙌 Autor

<p align="center">
  <b>Lucas Riboldi</b><br>
  Feito com ⚽ + ☕
</p>

---

## ⭐ Apoie o projeto

Se curtiu, deixa uma ⭐ no repositório!

---
