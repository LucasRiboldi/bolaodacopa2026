# 🏆 Bolão Copa do Mundo 2026 – Palpites Grátis e Ranking em Tempo Real

[![Licença MIT](https://img.shields.io/badge/Licença-MIT-brightgreen?style=for-the-badge)](LICENSE)
[![React](https://img.shields.io/badge/React-18-blue?style=for-the-badge&logo=react)](https://reactjs.org/)
[![Firebase](https://img.shields.io/badge/Firebase-Spark%20Plan-orange?style=for-the-badge&logo=firebase)](https://firebase.google.com/)
[![API](https://img.shields.io/badge/API-FOOTBALL-yellow?style=for-the-badge)](https://www.api-football.com/)
[![Deploy](https://img.shields.io/badge/Deploy-Firebase%20Hosting-ffca28?style=for-the-badge&logo=firebase)](https://firebase.google.com/docs/hosting)

> **⚽ Aposte com os amigos, acumule pontos e descubra quem é o verdadeiro rei dos palpites!**  
> *Sem custos, sem publicidade, 100% serverless e responsivo.*

---

## 📖 Sobre o projeto

O **Bolão Copa 2026** é uma plataforma web completa para você criar seu próprio bolão da Copa do Mundo. Com ele, seus amigos podem:

- ✅ **Registrar palpites de placar** para todos os 72 jogos da fase de grupos (formato planilha)
- ✅ **Prever a classificação** dos grupos (1º e 2º lugares)
- ✅ **Escolher os vencedores** do mata‑mata (oitavas, quartas, semi, final) com chaveamento dinâmico
- ✅ **Acumular pontos** com regras flexíveis (placar exato, resultado correto, classificação, bônus)
- ✅ **Acompanhar o ranking** geral em tempo real
- ✅ **Ser administrador** – edite resultados, configure pontuação, gerencie usuários

Tudo isso **gratuitamente**, usando apenas os planos gratuitos do Firebase e da API‑FOOTBALL.

---

## 🧰 Stack tecnológica (tudo de graça)

| Ferramenta | Uso | Motivo |
|------------|-----|--------|
| **React 18 + Vite** | Frontend | Rápido, moderno, fácil de hospedar |
| **Firebase Auth** | Login (Google + e‑mail/senha) | Gratuito e seguro |
| **Cloud Firestore** | Banco de dados em tempo real | Plano Spark gratuito, sem servidor |
| **API‑FOOTBALL** | Dados oficiais da Copa (jogos, resultados, datas) | Planos gratuitos com 100 req/dia, atualização em tempo real |
| **Firebase Hosting** | Deploy | CDN global, SSL gratuito |
| **GitHub Actions** | Sincronização automática de resultados | Cron job gratuito |
| **Flagpedia** | Bandeiras dos países | Imagens leves e fallback emoji |

---

## ✨ Funcionalidades em detalhe

### 🧑‍🤝‍🧑 Usuários
- Login com **Google** (um clique) ou **e‑mail/senha** (com registro)
- Perfil pessoal com histórico de palpites e estatísticas detalhadas
- Palpites avançados: classificação dos grupos, mata‑mata, bônus (semifinalistas, finalistas, campeão)

### ⚽ Fase de grupos
- Todos os 72 jogos em formato **planilha** (um por linha)
- Campos de gols para mandante e visitante
- Salvamento individual ou em massa
- Bloqueio automático após o início da partida

### 🏆 Mata‑mata
- Usuário define os **dois classificados** de cada grupo (1º e 2º lugar)
- O sistema gera automaticamente os confrontos das **oitavas de final**
- Escolha dos vencedores → quartas → semi → final
- Bônus extras: acertar semifinalistas, finalistas e campeão

### 📊 Ranking
- Pontuação **total** calculada pelo administrador (ou via GitHub Action)
- Regras completas e configuráveis:
  - Placar exato: 6 pontos
  - Resultado correto (vitória/empate): 2 pontos
  - 2 classificados do grupo (sem ordem): 5 pontos
  - 1 classificado: 2 pontos
  - Ordem correta: +3 pontos
  - Mata‑mata: 4 / 6 / 10 / 12 pontos por fase
  - Bônus: 5 / 7 / 12 pontos
- Ranking atualizado ao vivo (usa coleção `rankings` do Firestore)

### 🔧 Painel do Administrador
- **Fase de Grupos**: visualizar/editar todos os jogos, criar os 72 jogos iniciais
- **Mata‑mata**: adicionar/editar/remover jogos eliminatórios
- **Configurações**: ajustar todos os critérios de pontuação (valores salvos no Firestore)
- **Usuários**: listar todos os usuários, ver quantos palpites fizeram e se já preencheram mata‑mata
- **Sincronização manual**: buscar resultados da API‑FOOTBALL e atualizar o banco
- **Cálculo completo**: recalcular ranking somando placares + grupos + mata‑mata + bônus

### 📱 Responsividade
- Layout adaptado para desktop, tablet e celular
- Tabelas com rolagem horizontal (no celular)
- Menu e botões otimizados para toque

---

## 🚀 Como rodar o projeto localmente

### Pré‑requisitos
- **Node.js** (versão 18 ou superior) → [baixar aqui](https://nodejs.org/)
- **npm** (já vem com o Node)
- **Conta no Firebase** (gratuita)

### Passo a passo

1. **Clone o repositório**
   ```bash
   git clone https://github.com/LucasRiboldi/bolao-2026.git
   cd bolao-2026

   