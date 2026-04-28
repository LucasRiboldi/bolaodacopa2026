import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import GamesTab from "./GamesTab";
import KnockoutBracket from "./KnockoutBracket";

export default function UserDashboard({ user, userProfile, displayName }) {
  const [activeTab, setActiveTab] = useState("groups");
  const [userPoints, setUserPoints] = useState(0);

  useEffect(() => {
    const fetchUserPoints = async () => {
      if (!user) {
        return;
      }

      const rankDoc = await getDoc(doc(db, "rankings", user.uid));
      if (rankDoc.exists()) {
        setUserPoints(rankDoc.data().totalPoints || 0);
      }
    };

    fetchUserPoints();
  }, [user]);

  return (
    <div className="user-dashboard">
      <section className="dashboard-hero">
        <div className="dashboard-hero-copy">
          <span className="panel-kicker">⚽ Seu jogo</span>
          <h2>Ola, {displayName}</h2>
          <p>Palpite jogo a jogo na fase de grupos e monte os avancos do mata-mata oficial da Copa 2026.</p>
        </div>

        <div className="dashboard-score-card">
          <img
            src={user.photoURL || userProfile?.photoURL || "/default-avatar.png"}
            alt={displayName}
            className="user-avatar user-avatar--large"
          />
          <div>
            <span className="dashboard-score-label">Pontuacao atual</span>
            <strong className="dashboard-score-value">{userPoints} pts</strong>
          </div>
        </div>
      </section>

      <div className="dashboard-tabs">
        <button className={activeTab === "groups" ? "active" : ""} onClick={() => setActiveTab("groups")}>
          ⚽ Fase de grupos
        </button>
        <button className={activeTab === "knockout" ? "active" : ""} onClick={() => setActiveTab("knockout")}>
          🏆 Mata-mata
        </button>
      </div>

      <div className="dashboard-content">
        {activeTab === "groups" && <GamesTab user={user} />}
        {activeTab === "knockout" && <KnockoutBracket user={user} />}
      </div>
    </div>
  );
}
