import { useEffect, useState } from "react";
import { collection, doc, getDoc, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "../firebase";

const getFallbackName = (uid) => `apostador-${uid.slice(0, 5)}`;
const podiumIcon = ["🥇", "🥈", "🥉"];

export default function Ranking({ limit }) {
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRanking = async () => {
      try {
        const rankingQuery = query(collection(db, "rankings"), orderBy("totalPoints", "desc"));
        const rankingSnapshot = await getDocs(rankingQuery);
        const userIds = rankingSnapshot.docs.map((item) => item.id);
        const userMap = {};

        for (const uid of userIds) {
          const userDoc = await getDoc(doc(db, "users", uid));
          userMap[uid] = userDoc.exists()
            ? userDoc.data().displayName || getFallbackName(uid)
            : getFallbackName(uid);
        }

        let nextRanking = rankingSnapshot.docs.map((item) => ({
          userId: item.id,
          name: userMap[item.id],
          points: item.data().totalPoints || 0,
        }));

        if (limit) {
          nextRanking = nextRanking.slice(0, limit);
        }

        setRanking(nextRanking);
      } catch (error) {
        console.error("Erro ao carregar ranking:", error);
        setRanking([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRanking();
  }, [limit]);

  if (loading) {
    return <div className="ranking-empty">Carregando ranking...</div>;
  }

  if (ranking.length === 0) {
    return <div className="ranking-empty">Ainda nao ha pontuacoes publicadas.</div>;
  }

  return (
    <div className="ranking-list">
      {ranking.map((item, index) => (
        <article key={item.userId} className="ranking-card">
          <div className="ranking-position">{podiumIcon[index] || String(index + 1).padStart(2, "0")}</div>
          <div className="ranking-user">
            <strong>{item.name}</strong>
            <span>Apostador</span>
          </div>
          <div className="ranking-points">
            <strong>{item.points}</strong>
            <span>pts</span>
          </div>
        </article>
      ))}
    </div>
  );
}
