// src/components/GroupStageMatchesTable.jsx
import { useState, useEffect } from "react";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { Flag } from "../utils/countryCodes";
import { getTeamNamePortuguese } from "../utils/teamNames";

const formatDateTime = (startTime) => {
  if (!startTime) return "A definir";
  const date = new Date(startTime);
  if (isNaN(date.getTime())) return "Data inválida";
  return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export default function GroupStageMatchesTable({ user, selectedGroup, matchesFromJson }) {
  const [matches, setMatches] = useState([]);
  const [predictions, setPredictions] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [savingAll, setSavingAll] = useState(false);

  useEffect(() => {
    if (!matchesFromJson.length) return;
    let filtered = matchesFromJson.filter(m => m.round === "group" && m.group === selectedGroup);
    filtered.sort((a,b) => new Date(a.startTime) - new Date(b.startTime));
    setMatches(filtered);
    const fetchPredictions = async () => {
      const predMap = {};
      for (const match of filtered) {
        const predDoc = await getDoc(doc(db, "predictions", `${user.uid}_${match.id}`));
        if (predDoc.exists()) predMap[match.id] = predDoc.data();
        else predMap[match.id] = { homeScore: "", awayScore: "" };
      }
      setPredictions(predMap);
      setLoading(false);
    };
    fetchPredictions();
  }, [matchesFromJson, selectedGroup, user]);

  const savePrediction = async (matchId) => {
    const pred = predictions[matchId];
    if (pred.homeScore === "" || pred.awayScore === "") {
      alert("Preencha ambos os placares.");
      return;
    }
    setSaving(prev => ({ ...prev, [matchId]: true }));
    try {
      await setDoc(doc(db, "predictions", `${user.uid}_${matchId}`), {
        userId: user.uid, matchId, homeScore: Number(pred.homeScore), awayScore: Number(pred.awayScore),
        updatedAt: new Date().toISOString()
      });
      setSaving(prev => ({ ...prev, [matchId]: "saved" }));
      setTimeout(() => setSaving(prev => ({ ...prev, [matchId]: false })), 1000);
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar.");
      setSaving(prev => ({ ...prev, [matchId]: false }));
    }
  };

  if (loading) return <div>Carregando palpites...</div>;

  return (
    <div className="matches-table-container">
      <div className="table-header-actions">
        <h2>Grupo {selectedGroup}</h2>
        <button onClick={() => savingAll} className="save-all-btn">💾 Salvar todos</button>
      </div>
      <table className="matches-planilha">
        <thead>
          <tr><th>Data/Hora</th><th>Mandante</th><th>Gols</th><th></th><th>Gols</th><th>Visitante</th><th>Ações</th></tr>
        </thead>
        <tbody>
          {matches.map(match => {
            const pred = predictions[match.id] || { homeScore: "", awayScore: "" };
            const isStarted = new Date(match.startTime) < new Date();
            return (
              <tr key={match.id}>
                <td>{formatDateTime(match.startTime)}</td>
                <td className="team-cell"><Flag teamName={match.homeTeam} size={24} />{getTeamNamePortuguese(match.homeTeam)}</td>
                <td><input type="number" min="0" value={pred.homeScore} onChange={e => setPredictions({...predictions, [match.id]: {...pred, homeScore: e.target.value}})} disabled={isStarted} /></td>
                <td>X</td>
                <td><input type="number" min="0" value={pred.awayScore} onChange={e => setPredictions({...predictions, [match.id]: {...pred, awayScore: e.target.value}})} disabled={isStarted} /></td>
                <td className="team-cell"><Flag teamName={match.awayTeam} size={24} />{getTeamNamePortuguese(match.awayTeam)}</td>
                <td>{!isStarted && <button onClick={() => savePrediction(match.id)} disabled={saving[match.id]} className="save-row-btn">{saving[match.id] ? "..." : "Salvar"}</button>}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}