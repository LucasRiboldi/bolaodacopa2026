// src/components/GamesTab.jsx
import { useState, useEffect } from "react";
import GroupStageMatchesTable from "./GroupStageMatchesTable";

export default function GamesTab({ user }) {
  const [selectedGroup, setSelectedGroup] = useState("A");
  const [matches, setMatches] = useState([]);
  const [loadingJSON, setLoadingJSON] = useState(true);

  useEffect(() => {
    // Carrega os jogos do arquivo JSON manual
    fetch("/matches-data.json")
      .then(res => res.json())
      .then(data => {
        setMatches(data);
        setLoadingJSON(false);
      })
      .catch(err => {
        console.error("Erro ao carregar JSON:", err);
        setLoadingJSON(false);
      });
  }, []);

  if (loadingJSON) return <div>Carregando jogos...</div>;

  return (
    <div>
      <div className="games-header">
        <h2>⚽ FASE DE GRUPOS</h2>
      </div>
      <div className="groups-filter">
        {["A","B","C","D","E","F","G","H","I","J","K","L"].map(g => (
          <button key={g} className={`group-filter-btn ${selectedGroup === g ? "active" : ""}`} onClick={() => setSelectedGroup(g)}>
            Grupo {g}
          </button>
        ))}
      </div>
      <GroupStageMatchesTable user={user} selectedGroup={selectedGroup} matchesFromJson={matches} />
    </div>
  );
}