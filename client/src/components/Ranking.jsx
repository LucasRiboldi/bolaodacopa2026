// src/components/Ranking.jsx
import { useState, useEffect } from "react";
import { collection, getDocs, query, orderBy, doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { getTeamNamePortuguese } from "../utils/teamNames";

export default function Ranking({ limit }) {
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRanking = async () => {
      setLoading(true);
      try {
        const rankingsQuery = query(collection(db, "rankings"), orderBy("totalPoints", "desc"));
        const rankingsSnapshot = await getDocs(rankingsQuery);
        if (rankingsSnapshot.empty) {
          setRanking([]);
          setLoading(false);
          return;
        }
        const userIds = rankingsSnapshot.docs.map(doc => doc.id);
        const userNames = {};
        for (const uid of userIds) {
          const userDoc = await getDoc(doc(db, "users", uid));
          userNames[uid] = userDoc.exists() ? (userDoc.data().displayName || userDoc.data().email || "Usuário") : "Usuário desconhecido";
        }
        const fullList = rankingsSnapshot.docs.map(doc => ({
          userId: doc.id,
          name: userNames[doc.id] || "Usuário",
          points: doc.data().totalPoints || 0,
        }));
        const rankingList = limit ? fullList.slice(0, limit) : fullList;
        setRanking(rankingList);
      } catch (err) {
        setError("Não foi possível carregar o ranking.");
      } finally {
        setLoading(false);
      }
    };
    fetchRanking();
  }, [limit]);

  if (loading) return <div className="ranking-loading">Carregando ranking...</div>;
  if (error) return <div className="ranking-error">{error}</div>;

  const getMedal = (index) => {
    if (index === 0) return "🥇";
    if (index === 1) return "🥈";
    if (index === 2) return "🥉";
    return `${index + 1}º`;
  };

  return (
    <div className="ranking-container">
      <h2 style={{ marginBottom: "1rem" }}>🏆 Ranking Geral</h2>
      {ranking.length === 0 ? <p>Nenhuma pontuação registrada.</p> : (
        <div>
          <div className="ranking-header">
            <span>Posição</span>
            <span>Participante</span>
            <span>Pontos</span>
          </div>
          {ranking.map((item, index) => (
            <div key={item.userId} className="ranking-row">
              <span className="medal">{getMedal(index)}</span>
              <span>{item.name}</span>
              <span>{item.points}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}