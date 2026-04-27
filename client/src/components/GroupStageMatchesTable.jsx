// src/components/GroupStageMatchesTable.jsx
import { useState, useEffect } from "react";
import { collection, getDocs, doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { Flag } from "../utils/countryCodes";
import { groups } from "../utils/groupConfig";
import { getTeamNamePortuguese } from "../utils/teamNames";

// Função auxiliar para formatar data/hora de forma segura
const formatDateTime = (startTime) => {
  if (!startTime) return "A definir";
  const date = new Date(startTime);
  if (isNaN(date.getTime())) return "A definir";
  return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export default function GroupStageMatchesTable({ user, selectedGroup }) {
  const [matches, setMatches] = useState([]);
  const [predictions, setPredictions] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [savingAll, setSavingAll] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) {
        console.log("Sem usuário autenticado");
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const matchesSnapshot = await getDocs(collection(db, "matches"));
        let matchesList = matchesSnapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .filter((m) => m.round === "group" && m.group && groups[m.group]);

        if (selectedGroup) {
          matchesList = matchesList.filter((m) => m.group === selectedGroup);
        }

        matchesList.sort((a, b) => {
          if (a.group !== b.group) return a.group.localeCompare(b.group);
          return new Date(a.startTime) - new Date(b.startTime);
        });

        setMatches(matchesList);

        // Buscar palpites do usuário
        const predictionsMap = {};
        for (const match of matchesList) {
          const docId = `${user.uid}_${match.id}`;
          const predDoc = await getDoc(doc(db, "predictions", docId));
          if (predDoc.exists()) {
            predictionsMap[match.id] = predDoc.data();
          } else {
            predictionsMap[match.id] = { homeScore: "", awayScore: "" };
          }
        }
        setPredictions(predictionsMap);
      } catch (error) {
        console.error("Erro ao carregar jogos:", error);
        setError("Erro ao carregar os jogos. Tente recarregar a página.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user, selectedGroup]);

  const handleScoreChange = (matchId, field, value) => {
    setPredictions((prev) => ({
      ...prev,
      [matchId]: { ...prev[matchId], [field]: value === "" ? "" : Number(value) },
    }));
  };

  const savePrediction = async (matchId) => {
    const match = matches.find((m) => m.id === matchId);
    if (!match) {
      console.error("Jogo não encontrado:", matchId);
      alert("Erro: jogo não encontrado.");
      return;
    }

    // Verificar se o jogo já começou
    const matchStart = match.startTime ? new Date(match.startTime) : null;
    if (matchStart && new Date() > matchStart) {
      alert(`Jogo ${getTeamNamePortuguese(match.homeTeam)} x ${getTeamNamePortuguese(match.awayTeam)} já começou! Não é mais possível alterar.`);
      return;
    }

    const pred = predictions[matchId];
    if (pred.homeScore === "" || pred.awayScore === "") {
      alert("Preencha ambos os placares antes de salvar.");
      return;
    }

    setSaving((prev) => ({ ...prev, [matchId]: true }));
    try {
      const docId = `${user.uid}_${matchId}`;
      await setDoc(doc(db, "predictions", docId), {
        userId: user.uid,
        matchId: matchId,
        homeScore: Number(pred.homeScore),
        awayScore: Number(pred.awayScore),
        updatedAt: new Date().toISOString(),
      });
      setSaving((prev) => ({ ...prev, [matchId]: "saved" }));
      setTimeout(() => setSaving((prev) => ({ ...prev, [matchId]: false })), 1000);
    } catch (error) {
      console.error("Erro ao salvar aposta:", error);
      alert(`Erro ao salvar: ${error.message}. Verifique se você está logado e tem permissão.`);
      setSaving((prev) => ({ ...prev, [matchId]: false }));
    }
  };

  const saveAllPredictions = async () => {
    setSavingAll(true);
    let successCount = 0;

    if (!user || !user.uid) {
      alert("Você precisa estar logado para salvar palpites.");
      return;
    }

    for (const match of matches) {
      const matchId = match.id;
      const matchStart = match.startTime ? new Date(match.startTime) : null;
      if (matchStart && new Date() > matchStart) continue;
      const pred = predictions[matchId];
      if (pred.homeScore !== "" && pred.awayScore !== "") {
        try {
          const docId = `${user.uid}_${matchId}`;
          await setDoc(doc(db, "predictions", docId), {
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
  if (error) return <div className="error-message">{error}</div>;

  const groupedMatches = matches.reduce((acc, match) => {
    const group = match.group;
    if (!acc[group]) acc[group] = [];
    acc[group].push(match);
    return acc;
  }, {});

  const pageTitle = selectedGroup ? `Grupo ${selectedGroup}` : "📋 Fase de Grupos – Palpites de placar";

  return (
    <div className="matches-table-container">
      <div className="table-header-actions">
        <h2>{pageTitle}</h2>
        <button onClick={saveAllPredictions} disabled={savingAll} className="save-all-btn">
          {savingAll ? "Salvando todos..." : "💾 Salvar todos os palpites"}
        </button>
      </div>

      {Object.keys(groupedMatches).sort().map((group) => (
        <div key={group} className="group-section">
          {!selectedGroup && <h3 className="group-title">Grupo {group}</h3>}
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
                  const matchStart = match.startTime ? new Date(match.startTime) : null;
                  const isStarted = matchStart ? new Date() > matchStart : false;
                  const pred = predictions[match.id] || { homeScore: "", awayScore: "" };
                  const isSaved = saving[match.id] === "saved";
                  const isSaving = saving[match.id] === true;

                  const homeName = getTeamNamePortuguese(match.homeTeam);
                  const awayName = getTeamNamePortuguese(match.awayTeam);

                  return (
                    <tr key={match.id} className={isStarted ? "match-started" : ""}>
                      <td className="match-datetime">{formatDateTime(match.startTime)}</td>
                      <td className="team-cell">
                        <Flag teamName={match.homeTeam} size={24} />
                        <span>{homeName}</span>
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
                        <span>{awayName}</span>
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