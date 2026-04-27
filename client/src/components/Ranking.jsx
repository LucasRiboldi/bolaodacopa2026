// src/components/Ranking.jsx
import { useState, useEffect } from "react";
import { collection, getDocs, query, orderBy, doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

export default function Ranking({ limit }) {
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRanking = async () => {
      const q = query(collection(db, "rankings"), orderBy("totalPoints", "desc"));
      const snap = await getDocs(q);
      const userIds = snap.docs.map(d => d.id);
      const userNames = {};
      for (const uid of userIds) {
        const userDoc = await getDoc(doc(db, "users", uid));
        userNames[uid] = userDoc.exists() ? (userDoc.data().displayName || userDoc.data().email) : "Usuário";
      }
      let list = snap.docs.map(doc => ({ userId: doc.id, name: userNames[doc.id], points: doc.data().totalPoints }));
      if (limit) list = list.slice(0, limit);
      setRanking(list);
      setLoading(false);
    };
    fetchRanking();
  }, [limit]);

  if (loading) return <div>Carregando ranking...</div>;

  return (
    <div className="ranking-container">
      <div className="ranking-header"><span>#</span><span>USUÁRIO</span><span>PTS</span></div>
      {ranking.map((item, idx) => (
        <div key={item.userId} className="ranking-row">
          <span>{idx+1}º</span>
          <span>{item.name}</span>
          <span>{item.points}</span>
        </div>
      ))}
    </div>
  );
}