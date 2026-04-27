// src/App.jsx
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, googleProvider, db } from "./firebase";
import { signInWithPopup, signOut } from "firebase/auth";
import { doc, getDoc, collection, writeBatch } from "firebase/firestore";
import { useState, useEffect } from "react";
import axios from "axios";
import { getGroupByTeam } from "./utils/groupConfig";
import LandingPage from "./components/LandingPage";
import UserDashboard from "./components/UserDashboard";
import UserProfile from "./components/UserProfile";
import AdminPanel from "./components/AdminPanel";
import EmailLogin from "./components/EmailLogin";

function App() {
  const [user, loading] = useAuthState(auth);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentView, setCurrentView] = useState("dashboard");
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");

  useEffect(() => {
    const checkAdmin = async () => {
      if (user) {
        const adminDoc = await getDoc(doc(db, "admins", user.uid));
        setIsAdmin(adminDoc.exists());
      } else {
        setIsAdmin(false);
      }
    };
    checkAdmin();
  }, [user]);

  const teamNameMap = {
    "United States": "USA",
    "Korea Republic": "South Korea",
    "Czechia": "Czech Republic",
    "Bosnia-Herzegovina": "Bosnia and Herzegovina",
    "Côte d'Ivoire": "Ivory Coast",
    "Cape Verde Islands": "Cape Verde",
    "DR Congo": "DR Congo",
  };
  const normalize = (apiName) => teamNameMap[apiName] || apiName;

  const handleSync = async () => {
    if (!isAdmin) return;
    setSyncing(true);
    setSyncMessage("Buscando jogos da Copa 2026 via API-FOOTBALL...");
    try {
      const API_KEY = import.meta.env.VITE_API_FOOTBALL_KEY;
      if (!API_KEY) {
        setSyncMessage("❌ Chave da API-FOOTBALL não configurada.");
        setSyncing(false);
        return;
      }
      const response = await axios.get("https://v3.football.api-sports.io/fixtures", {
        headers: { "x-apisports-key": API_KEY },
        params: { league: 1, season: 2026 },
      });
      const fixtures = response.data.response;
      if (!fixtures || fixtures.length === 0) {
        setSyncMessage("Nenhum jogo encontrado.");
        setSyncing(false);
        return;
      }
      setSyncMessage(`Encontrados ${fixtures.length} jogos. Atualizando...`);
      const batch = writeBatch(db);
      const matchesRef = collection(db, "matches");

      for (const fixture of fixtures) {
        const homeTeam = normalize(fixture.teams.home.name);
        const awayTeam = normalize(fixture.teams.away.name);
        const group = getGroupByTeam(homeTeam) || getGroupByTeam(awayTeam);
        if (!group) continue;
        const id = `${group}_${homeTeam}_vs_${awayTeam}`.replace(/\s/g, "_");
        const roundName = fixture.league.round || "";
        let round = "group";
        if (roundName.includes("Round of 16")) round = "round16";
        else if (roundName.includes("Quarter")) round = "quarter";
        else if (roundName.includes("Semi")) round = "semi";
        else if (roundName.includes("Final")) round = "final";

        const matchData = {
          id,
          round,
          group,
          homeTeam,
          awayTeam,
          homeScore: fixture.goals.home ?? null,
          awayScore: fixture.goals.away ?? null,
          date: fixture.fixture.date.split("T")[0],
          time: fixture.fixture.time,
          stadium: fixture.fixture.venue.name,
          startTime: fixture.fixture.date,
          status: fixture.fixture.status.long || "Not Started",
        };
        const docRef = doc(matchesRef, id);
        batch.set(docRef, matchData, { merge: true });
      }
      await batch.commit();
      setSyncMessage("✅ Sincronização concluída!");
    } catch (error) {
      console.error(error);
      setSyncMessage("❌ Erro ao sincronizar.");
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMessage(""), 5000);
    }
  };

  if (loading) return <div className="loader-full" style={{ textAlign: "center", marginTop: "2rem" }}>Carregando...</div>;

  if (!user) {
    return (
      <>
        <LandingPage />
        {showEmailModal && <EmailLogin onClose={() => setShowEmailModal(false)} />}
      </>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="logo" onClick={() => setCurrentView("dashboard")}>
          <img src="/worldcup2026-logo.png" alt="Logo" className="worldcup-logo" />
          <h1>Bolão <span>Copa 2026</span></h1>
        </div>
        <div className="user-info">
          <img src={user.photoURL} alt={user.displayName} className="user-avatar" />
          <span>{user.displayName}</span>
          <button onClick={() => signOut(auth)} className="logout-btn">Sair</button>
        </div>
      </header>

      {isAdmin && currentView !== "admin" && (
        <div className="admin-bar">
          <button onClick={handleSync} disabled={syncing} className="sync-btn">
            {syncing ? "Sincronizando..." : "🔄 Sincronizar jogos"}
          </button>
          {syncMessage && <span className="sync-msg">{syncMessage}</span>}
        </div>
      )}

      <main className="main-content">
        {currentView === "dashboard" && <UserDashboard user={user} />}
        {currentView === "profile" && <UserProfile user={user} />}
        {currentView === "admin" && isAdmin && <AdminPanel />}
      </main>

      <footer className="app-footer">
        <p>© 2026 Bolão Copa do Mundo – Palpites gratuitos</p>
      </footer>
    </div>
  );
}

export default App;