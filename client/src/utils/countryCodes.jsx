import { useState } from "react";

// Mapeamento de nomes de times para código ISO 3166-1 alpha-2
export const teamToCountryCode = {
  // Grupo A
  "Mexico": "mx",
  "South Africa": "za",
  "South Korea": "kr",
  "Czech Republic": "cz",
  // Grupo B
  "Canada": "ca",
  "Bosnia and Herzegovina": "ba",
  "Qatar": "qa",
  "Switzerland": "ch",
  // Grupo C
  "Brazil": "br",
  "Morocco": "ma",
  "Haiti": "ht",
  "Scotland": "gb-sct",
  // Grupo D
  "USA": "us",
  "Australia": "au",
  "Paraguay": "py",
  "Turkey": "tr",
  // Grupo E
  "Germany": "de",
  "Curacao": "cw",
  "Ivory Coast": "ci",
  "Ecuador": "ec",
  // Grupo F
  "Netherlands": "nl",
  "Japan": "jp",
  "Tunisia": "tn",
  "Sweden": "se",
  // Grupo G
  "Belgium": "be",
  "Iran": "ir",
  "Egypt": "eg",
  "New Zealand": "nz",
  // Grupo H
  "Spain": "es",
  "Uruguay": "uy",
  "Saudi Arabia": "sa",
  "Cape Verde": "cv",
  // Grupo I
  "France": "fr",
  "Senegal": "sn",
  "Norway": "no",
  "Iraq": "iq",
  // Grupo J
  "Argentina": "ar",
  "Austria": "at",
  "Algeria": "dz",
  "Jordan": "jo",
  // Grupo K
  "Portugal": "pt",
  "Colombia": "co",
  "Uzbekistan": "uz",
  "DR Congo": "cd",
  // Grupo L
  "England": "gb-eng",
  "Croatia": "hr",
  "Panama": "pa",
  "Ghana": "gh",
};

// Função para obter URL da bandeira (Flagpedia)
export const getFlagUrl = (teamName, size = "72x54") => {
  const code = teamToCountryCode[teamName];
  if (!code) return null;
  return `https://flagpedia.net/data/flags/icon/${size}/${code}.png`;
};

// Fallback: emoji
export const getFlagEmoji = (teamName) => {
  const code = teamToCountryCode[teamName];
  if (!code) return "🏆";
  const emoji = code
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
  return emoji;
};

// Componente de bandeira com fallback
export const Flag = ({ teamName, size = 40, className = "" }) => {
  const [imgError, setImgError] = useState(false);
  const flagUrl = getFlagUrl(teamName);
  const emoji = getFlagEmoji(teamName);

  if (!flagUrl || imgError) {
    return (
      <span className={`flag-emoji ${className}`} style={{ fontSize: size }}>
        {emoji}
      </span>
    );
  }

  return (
    <img
      src={flagUrl}
      alt={teamName}
      className={`flag-image ${className}`}
      style={{ width: size, height: "auto" }}
      onError={() => setImgError(true)}
      loading="lazy"
    />
  );
};