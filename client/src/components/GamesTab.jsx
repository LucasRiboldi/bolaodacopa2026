// src/components/GamesTab.jsx
import { useState } from "react";
import GroupStageMatchesTable from "./GroupStageMatchesTable";
import KnockoutBracket from "./KnockoutBracket";

export default function GamesTab({ user }) {
  const [selectedGroup, setSelectedGroup] = useState("A");
  const [view, setView] = useState("groups"); // groups ou knockout

  return (
    <div>
      <div className="games-header">
        <h2>FASE DE GRUPOS</h2>
        <button
          className={`view-switch ${view === "knockout" ? "active" : ""}`}
          onClick={() => setView(view === "groups" ? "knockout" : "groups")}
        >
          {view === "groups" ? "🏆 Ver Mata‑Mata" : "⚽ Voltar para Grupos"}
        </button>
      </div>
      <p className="games-subtitle">APOSTE EM TODOS OS JOGOS DA COPA 2026!</p>

      {view === "groups" && (
        <>
          <div className="groups-filter">
            {["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"].map((g) => (
              <button
                key={g}
                className={`group-filter-btn ${selectedGroup === g ? "active" : ""}`}
                onClick={() => setSelectedGroup(g)}
              >
                Grupo {g}
              </button>
            ))}
          </div>
          <GroupStageMatchesTable user={user} selectedGroup={selectedGroup} />
        </>
      )}

      {view === "knockout" && (
        <>
          <h2 className="knockout-title">FASE DE MATA‑MATA</h2>
          <KnockoutBracket user={user} />
        </>
      )}

      <div className="regulation">
        <h4>Regulamento do Bolão</h4>
        <p>✅ Acertou o resultado exato = 6 pts</p>
        <p>✅ Acertou o vencedor = 2 pts</p>
        <p>✅ Acertou o empate = 0 pts (pontuação por resultado correto)</p>
        <small>(Os pontos são configuráveis pelo administrador)</small>
      </div>
    </div>
  );
}