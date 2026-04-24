// src/components/Ranking.jsx
import { useState, useEffect } from "react";
import { collection, getDocs, query, orderBy, doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

export default function Ranking() {
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRanking = async () => {
      setLoading(true);
      try {
        // Buscar rankings ordenados por pontuação total (decrescente)
        const rankingsQuery = query(collection(db, "rankings"), orderBy("totalPoints", "desc"));
        const rankingsSnapshot = await getDocs(rankingsQuery);
        
        if (rankingsSnapshot.empty) {
          setRanking([]);
          setLoading(false);
          return;
        }

        // Mapear IDs dos usuários para buscar seus nomes
        const userIds = rankingsSnapshot.docs.map(doc => doc.id);
        const userNames = {};
        
        // Buscar nomes de todos os usuários de uma só vez (evita múltiplas chamadas)
        for (const uid of userIds) {
          const userDoc = await getDoc(doc(db, "users", uid));
          if (userDoc.exists()) {
            userNames[uid] = userDoc.data().displayName || userDoc.data().email || "Usuário";
          } else {
            userNames[uid] = "Usuário desconhecido";
          }
        }

        // Montar lista do ranking
        const rankingList = rankingsSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            userId: doc.id,
            name: userNames[doc.id] || "Usuário",
            points: data.totalPoints || 0,
            details: data.details || null
          };
        });

        setRanking(rankingList);
      } catch (err) {
        console.error("Erro ao carregar ranking:", err);
        setError("Não foi possível carregar o ranking. Tente novamente mais tarde.");
      } finally {
        setLoading(false);
      }
    };

    fetchRanking();
  }, []);

  if (loading) return <div className="ranking-loading">Carregando ranking...</div>;
  if (error) return <div className="ranking-error">{error}</div>;

  return (
    <div className="ranking-container">
      <h2>🏆 Ranking Geral</h2>
      {ranking.length === 0 ? (
        <p>Nenhuma pontuação registrada ainda. Aguarde o administrador calcular o ranking.</p>
      ) : (
        <div className="ranking-table">
          <div className="ranking-header">
            <span>Posição</span>
            <span>Participante</span>
            <span>Pontos</span>
          </div>
          {ranking.map((item, index) => (
            <div key={item.userId} className="ranking-row">
              <span>{index + 1}º</span>
              <span>{item.name}</span>
              <span>{item.points}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}