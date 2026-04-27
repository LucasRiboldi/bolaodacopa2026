// src/utils/countryCodes.jsx
import { useState } from "react";

// Mapeamento de nomes de times para código ISO (para nome do arquivo)
export const teamToCountryCode = {
  "Mexico": "mx",
  "South Africa": "za",
  "South Korea": "kr",
  "Czech Republic": "cz",
  "Canada": "ca",
  "Bosnia and Herzegovina": "ba",
  "Qatar": "qa",
  "Switzerland": "ch",
  "Brazil": "br",
  "Morocco": "ma",
  "Haiti": "ht",
  "Scotland": "gb-sct",
  "USA": "us",
  "Australia": "au",
  "Paraguay": "py",
  "Turkey": "tr",
  "Germany": "de",
  "Curacao": "cw",
  "Ivory Coast": "ci",
  "Ecuador": "ec",
  "Netherlands": "nl",
  "Japan": "jp",
  "Tunisia": "tn",
  "Sweden": "se",
  "Belgium": "be",
  "Iran": "ir",
  "Egypt": "eg",
  "New Zealand": "nz",
  "Spain": "es",
  "Uruguay": "uy",
  "Saudi Arabia": "sa",
  "Cape Verde": "cv",
  "France": "fr",
  "Senegal": "sn",
  "Norway": "no",
  "Iraq": "iq",
  "Argentina": "ar",
  "Austria": "at",
  "Algeria": "dz",
  "Jordan": "jo",
  "Portugal": "pt",
  "Colombia": "co",
  "Uzbekistan": "uz",
  "DR Congo": "cd",
  "England": "gb-eng",
  "Croatia": "hr",
  "Panama": "pa",
  "Ghana": "gh",
};

// Obtém caminho da bandeira local
const getFlagPath = (teamName, size = 32) => {
  const code = teamToCountryCode[teamName];
  if (!code) return null;
  // Para subdivisões (Inglaterra, Escócia), usamos emoji fallback
  if (code === "gb-eng" || code === "gb-sct") return null;
  return `/flags/${code}.png`;
};

// Fallback: emoji regional
export const getFlagEmoji = (teamName) => {
  const code = teamToCountryCode[teamName];
  if (!code) return "🏆";
  if (code === "gb-eng") return "🏴󠁧󠁢󠁥󠁮󠁧󠁿";
  if (code === "gb-sct") return "🏴󠁧󠁢󠁳󠁣󠁴󠁿";
  const emoji = code
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
  return emoji;
};

// Componente de bandeira com fallback automático
export const Flag = ({ teamName, size = 24, className = "" }) => {
  const [imgError, setImgError] = useState(false);
  const flagPath = getFlagPath(teamName, size);
  const emoji = getFlagEmoji(teamName);

  if (!flagPath || imgError) {
    return (
      <span
        className={`flag-emoji ${className}`}
        style={{ fontSize: size, display: "inline-block", lineHeight: 1 }}
      >
        {emoji}
      </span>
    );
  }

  return (
    <img
      src={flagPath}
      alt={teamName}
      className={`flag-image ${className}`}
      style={{ width: size, height: "auto", display: "inline-block", verticalAlign: "middle" }}
      onError={() => setImgError(true)}
      loading="lazy"
    />
  );
};