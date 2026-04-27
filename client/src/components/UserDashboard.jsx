// src/components/UserDashboard.jsx
import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import GamesTab from "./GamesTab";
import Ranking from "./Ranking";
import GroupStandings from "./GroupStandings";
import UserProfile from "./UserProfile";

export default function UserDashboard({ user }) {
  const [activeTab, setActiveTab] = useState("inicio");
  const [userPoints, setUserPoints] = useState(0);

  useEffect(() => {
    const fetchUserPoints = async () => {
      if (!user) return;
      const rankDoc = await getDoc(doc(db, "rankings", user.uid));
      if (rankDoc.exists()) setUserPoints(rankDoc.data().totalPoints || 0);
    };
    fetchUserPoints();
  }, [user]);

  return (
    <div className="user-dashboard">
      <div className="dashboard-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <h2>Olá, {user.displayName || user.email}!</h2>
          <p>⭐ Seus pontos: <strong>{userPoints}</strong></p>
        </div>
        <img src={user.photoURL || "/default-avatar.png"} alt="avatar" className="user-avatar" style={{ width: 60, height: 60 }} />
      </div>

      <div className="dashboard-tabs">
        <button className={activeTab === "inicio" ? "active" : ""} onClick={() => setActiveTab("inicio")}>🏠 INÍCIO</button>
        <button className={activeTab === "ranking" ? "active" : ""} onClick={() => setActiveTab("ranking")}>📊 RANKING</button>
        <button className={activeTab === "jogos" ? "active" : ""} onClick={() => setActiveTab("jogos")}>⚽ JOGOS</button>
        <button className={activeTab === "perfil" ? "active" : ""} onClick={() => setActiveTab("perfil")}>👤 PERFIL</button>
      </div>

      <div className="dashboard-content">
        {activeTab === "inicio" && (
          <div>
            <h3>🎯 Próximos confrontos</h3>
            <p>Acompanhe seus palpites e veja a tabela de classificação.</p>
            <GroupStandings />
          </div>
        )}
        {activeTab === "ranking" && <Ranking />}
        {activeTab === "jogos" && <GamesTab user={user} />}
        {activeTab === "perfil" && <UserProfile user={user} />}
      </div>
    </div>
  );
}