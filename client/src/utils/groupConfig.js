// src/utils/groupConfig.js
// Grupos oficiais da Copa do Mundo 2026 - atualizado em abril de 2026
// ATENÇÃO: Os nomes dos times DEVEM corresponder exatamente aos nomes armazenados na coleção 'matches' do Firestore.

export const groups = {
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

// Lista de todos os times para facilitar buscas
export const allTeams = Object.values(groups).flat();

// Função para obter o grupo de um time
export const getGroupByTeam = (teamName) => {
  for (const [group, teams] of Object.entries(groups)) {
    if (teams.includes(teamName)) return group;
  }
  return null;
};