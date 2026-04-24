// src/components/Matches.jsx
import { useState } from "react";
import GroupStageMatchesTable from "./GroupStageMatchesTable";
import KnockoutBracket from "./KnockoutBracket";

export default function Matches({ user }) {
  const [activeTab, setActiveTab] = useState("group");

  return (
    <div className="betting-container">
      <div className="betting-tabs">
        <button className={activeTab === "group" ? "active" : ""} onClick={() => setActiveTab("group")}>
          ⚽ Fase de Grupos (placares)
        </button>
        <button className={activeTab === "knockout" ? "active" : ""} onClick={() => setActiveTab("knockout")}>
          🏆 Mata‑mata (classificação + vencedores)
        </button>
      </div>
      <div className="betting-content">
        {activeTab === "group" && <GroupStageMatchesTable user={user} />}
        {activeTab === "knockout" && <KnockoutBracket user={user} />}
      </div>
    </div>
  );
}