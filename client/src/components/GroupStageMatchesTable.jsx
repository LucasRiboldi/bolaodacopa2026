// src/components/GroupStageMatchesTable.jsx
import { useState, useEffect } from "react";
import { collection, getDocs, doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { Flag } from "../utils/countryCodes";
import { groups } from "../utils/groupConfig";

export default function GroupStageMatchesTable({ user }) {
  const [matches, setMatches] = useState([]);
  const [predictions, setPredictions] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [savingAll, setSavingAll] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const matchesSnapshot = await getDocs(collection(db, "matches"));
        let matchesList = matchesSnapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .filter((m) => m.round === "group" && m.group && groups[m.group]); // apenas grupos oficiais
        matchesList.sort((a, b) => {
          if (a.group !== b.group) return a.group.localeCompare(b.group);
          return new Date(a.startTime) - new Date(b.startTime);
        });
        setMatches(matchesList);

        const predictionsMap = {};
        for (const match of matchesList) {
          const predDoc = await getDoc(doc(db, "predictions", `${user.uid}_${match.id}`));
          if (predDoc.exists()) {
            predictionsMap[match.id] = predDoc.data();
          } else {
            predictionsMap[match.id] = { homeScore: "", awayScore: "" };
          }
        }
        setPredictions(predictionsMap);
      } catch (error) {
        console.error("Erro ao carregar jogos:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const handleScoreChange = (matchId, field, value) => {
    setPredictions((prev) => ({
      ...prev,
      [matchId]: { ...prev[matchId], [field]: value === "" ? "" : Number(value) },
    }));
  };

  const savePrediction = async (matchId) => {
    const match = matches.find((m) => m.id === matchId);
    if (!match) return;
    const matchStart = new Date(match.startTime);
    if (new Date() > matchStart) {
      alert(`Jogo ${match.homeTeam} x ${match.awayTeam} já começou! Não é mais possível alterar.`);
      return;
    }
    const pred = predictions[matchId];
    if (pred.homeScore === "" || pred.awayScore === "") {
      alert("Preencha ambos os placares antes de salvar.");
      return;
    }
    setSaving((prev) => ({ ...prev, [matchId]: true }));
    try {
      await setDoc(doc(db, "predictions", `${user.uid}_${matchId}`), {
        userId: user.uid,
        matchId,
        homeScore: Number(pred.homeScore),
        awayScore: Number(pred.awayScore),
        updatedAt: new Date().toISOString(),
      });
      setSaving((prev) => ({ ...prev, [matchId]: "saved" }));
      setTimeout(() => setSaving((prev) => ({ ...prev, [matchId]: false })), 1000);
    } catch (error) {
      console.error(error);
      alert("Erro ao salvar. Tente novamente.");
      setSaving((prev) => ({ ...prev, [matchId]: false }));
    }
  };

  const saveAllPredictions = async () => {
    setSavingAll(true);
    let successCount = 0;
    for (const match of matches) {
      const matchId = match.id;
      const matchStart = new Date(match.startTime);
      if (new Date() > matchStart) continue;
      const pred = predictions[matchId];
      if (pred.homeScore !== "" && pred.awayScore !== "") {
        try {
          await setDoc(doc(db, "predictions", `${user.uid}_${matchId}`), {
            userId: user.uid,
            matchId,
            homeScore: Number(pred.homeScore),
            awayScore: Number(pred.awayScore),
            updatedAt: new Date().toISOString(),
          });
          successCount++;
        } catch (error) {
          console.error(`Erro ao salvar jogo ${matchId}`, error);
        }
      }
    }
    alert(`${successCount} palpites salvos com sucesso!`);
    setSavingAll(false);
  };

  if (loading) return <div className="loading-table">Carregando jogos...</div>;

  // Agrupar por grupo
  const groupedMatches = matches.reduce((acc, match) => {
    const group = match.group;
    if (!acc[group]) acc[group] = [];
    acc[group].push(match);
    return acc;
  }, {});

  return (
    <div className="matches-table-container">
      <div className="table-header-actions">
        <h2>📋 Fase de Grupos – Palpites de placar</h2>
        <button onClick={saveAllPredictions} disabled={savingAll} className="save-all-btn">
          {savingAll ? "Salvando todos..." : "💾 Salvar todos os palpites"}
        </button>
      </div>

      {Object.keys(groupedMatches).sort().map((group) => (
        <div key={group} className="group-section">
          <h3 className="group-title">Grupo {group}</h3>
          <div className="table-responsive">
            <table className="matches-planilha">
              <thead>
                <tr>
                  <th>Data/Hora</th>
                  <th>Mandante</th>
                  <th>Gols</th>
                  <th></th>
                  <th>Gols</th>
                  <th>Visitante</th>
                  <th>Ações</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {groupedMatches[group].map((match) => {
                  const isStarted = new Date() > new Date(match.startTime);
                  const pred = predictions[match.id] || { homeScore: "", awayScore: "" };
                  const isSaved = saving[match.id] === "saved";
                  const isSaving = saving[match.id] === true;

                  return (
                    <tr key={match.id} className={isStarted ? "match-started" : ""}>
                      <td className="match-datetime">
                        {new Date(match.startTime).toLocaleDateString()} <br />
                        {new Date(match.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="team-cell">
                        <Flag teamName={match.homeTeam} size={24} />
                        <span>{match.homeTeam}</span>
                      </td>
                      <td className="score-cell">
                        <input
                          type="number"
                          min="0"
                          value={pred.homeScore}
                          onChange={(e) => handleScoreChange(match.id, "homeScore", e.target.value)}
                          disabled={isStarted}
                          placeholder="0"
                        />
                      </td>
                      <td className="vs-cell">X</td>
                      <td className="score-cell">
                        <input
                          type="number"
                          min="0"
                          value={pred.awayScore}
                          onChange={(e) => handleScoreChange(match.id, "awayScore", e.target.value)}
                          disabled={isStarted}
                          placeholder="0"
                        />
                      </td>
                      <td className="team-cell">
                        <Flag teamName={match.awayTeam} size={24} />
                        <span>{match.awayTeam}</span>
                      </td>
                      <td className="actions-cell">
                        {!isStarted && (
                          <button
                            onClick={() => savePrediction(match.id)}
                            disabled={isSaving || pred.homeScore === "" || pred.awayScore === ""}
                            className="save-row-btn"
                          >
                            {isSaving ? "..." : "Salvar"}
                          </button>
                        )}
                        {isStarted && <span className="blocked-label">⛔ Bloqueado</span>}
                      </td>
                      <td className="status-cell">
                        {isSaved && <span className="saved-icon">✓</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}