// src/components/UserProfile.jsx
import { useState, useEffect } from "react";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import GroupClassificationPicker from "./GroupClassificationPicker";
import KnockoutBracket from "./KnockoutBracket";
import BonusPredictions from "./BonusPredictions";

export default function UserProfile({ user }) {
  const [activeTab, setActiveTab] = useState("history");
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalPoints: 0, exactHits: 0, resultHits: 0, totalBets: 0 });

  useEffect(() => {
    const fetchUserPredictions = async () => {
      if (!user) return;
      try {
        const predSnapshot = await getDocs(collection(db, "predictions"));
        const userPreds = [];
        predSnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.userId === user.uid) userPreds.push({ id: doc.id, ...data });
        });

        const matchesSnapshot = await getDocs(collection(db, "matches"));
        const matches = {};
        matchesSnapshot.forEach((doc) => { matches[doc.id] = doc.data(); });

        let totalPoints = 0, exactHits = 0, resultHits = 0;

        const detailedPredictions = userPreds.map((pred) => {
          const match = matches[pred.matchId];
          if (!match || match.homeScore === null || match.awayScore === null) {
            return { ...pred, matchName: `${match?.homeTeam || "?"} x ${match?.awayTeam || "?"}`, realScore: null, points: null, status: "Aguardando resultado" };
          }
          const points = (pred.homeScore === match.homeScore && pred.awayScore === match.awayScore) ? 3 : 
                        ((pred.homeScore > pred.awayScore && match.homeScore > match.awayScore) ||
                         (pred.homeScore < pred.awayScore && match.homeScore < match.awayScore) ||
                         (pred.homeScore === pred.awayScore && match.homeScore === match.awayScore)) ? 1 : 0;
          totalPoints += points;
          if (points === 3) exactHits++;
          else if (points === 1) resultHits++;
          return {
            ...pred,
            matchName: `${match.homeTeam} x ${match.awayTeam}`,
            realScore: `${match.homeScore} - ${match.awayScore}`,
            points,
            status: points === 3 ? "✅ Placar exato" : points === 1 ? "🟡 Resultado correto" : "❌ Errou",
          };
        });

        setPredictions(detailedPredictions);
        setStats({ totalPoints, exactHits, resultHits, totalBets: detailedPredictions.length });
      } catch (error) {
        console.error("Erro ao carregar histórico:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchUserPredictions();
  }, [user]);

  if (loading) return <div className="profile-loading">Carregando seu perfil...</div>;

  return (
    <div className="user-profile">
      <div className="profile-header">
        <img src={user.photoURL} alt={user.displayName} className="profile-avatar" />
        <h2>{user.displayName}</h2>
        <p>{user.email}</p>
      </div>
      <div className="stats-cards">
        <div className="stat-card"><span className="stat-value">{stats.totalPoints}</span><span className="stat-label">Pontos totais</span></div>
        <div className="stat-card"><span className="stat-value">{stats.exactHits}</span><span className="stat-label">Acertos exatos</span></div>
        <div className="stat-card"><span className="stat-value">{stats.resultHits}</span><span className="stat-label">Resultados certos</span></div>
        <div className="stat-card"><span className="stat-value">{stats.totalBets}</span><span className="stat-label">Palpites</span></div>
      </div>
      <div className="profile-tabs">
        <button className={activeTab === "history" ? "active" : ""} onClick={() => setActiveTab("history")}>📋 Meus palpites (jogos)</button>
        <button className={activeTab === "advanced" ? "active" : ""} onClick={() => setActiveTab("advanced")}>🏆 Classificação e mata‑mata</button>
      </div>
      {activeTab === "history" && (
        <div className="predictions-history">
          {predictions.length === 0 && <p>Você ainda não fez nenhuma aposta de placar.</p>}
          {predictions.map((pred) => (
            <div key={pred.id} className="history-item">
              <div className="history-match">{pred.matchName}</div>
              <div className="history-scores">
                <span>Seu palpite: {pred.homeScore} - {pred.awayScore}</span>
                {pred.realScore && <span>Resultado real: {pred.realScore}</span>}
              </div>
              <div className={`history-points ${pred.points === 3 ? "exact" : pred.points === 1 ? "result" : "wrong"}`}>
                {pred.status} {pred.points !== null && `(+${pred.points} pts)`}
              </div>
            </div>
          ))}
        </div>
      )}
      {activeTab === "advanced" && (
        <div className="advanced-predictions">
          <GroupClassificationPicker user={user} />
          <hr className="separator" />
          <KnockoutBracket user={user} />
          <hr className="separator" />
          <BonusPredictions user={user} />
        </div>
      )}
    </div>
  );
}