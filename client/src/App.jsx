// src/App.jsx
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, googleProvider, db } from "./firebase";
import { signInWithPopup, signOut } from "firebase/auth";
import { doc, getDoc, collection, writeBatch } from "firebase/firestore";
import { useState, useEffect } from "react";
import axios from "axios";
import Matches from "./components/Matches";
import UserProfile from "./components/UserProfile";
import AdminPanel from "./components/AdminPanel";
import Ranking from "./components/Ranking";
import GroupStandings from "./components/GroupStandings";
import EmailLogin from "./components/EmailLogin";
import { getGroupByTeam } from "./utils/groupConfig";

function App() {
  const [user, loading] = useAuthState(auth);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentView, setCurrentView] = useState("matches");
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

  // Mapeamento de nomes da API-FOOTBALL para os nomes usados no bolão
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
        setSyncMessage("❌ Chave da API-FOOTBALL não configurada. Adicione VITE_API_FOOTBALL_KEY no .env");
        setSyncing(false);
        return;
      }
      const response = await axios.get("https://v3.football.api-sports.io/fixtures", {
        headers: { "x-apisports-key": API_KEY },
        params: { league: 1, season: 2026 }
      });
      const fixtures = response.data.response;
      if (!fixtures || fixtures.length === 0) {
        setSyncMessage("Nenhum jogo encontrado para a Copa 2026.");
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
        if (!group) {
          console.warn(`⚠️ Grupo não encontrado para ${homeTeam} x ${awayTeam}`);
          continue;
        }
        const id = `${group}_${homeTeam}_vs_${awayTeam}`.replace(/\s/g, '_');
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
          date: fixture.fixture.date.split('T')[0],
          time: fixture.fixture.time,
          stadium: fixture.fixture.venue.name,
          startTime: fixture.fixture.date,
          status: fixture.fixture.status.long || "Not Started",
        };
        const docRef = doc(matchesRef, id);
        batch.set(docRef, matchData, { merge: true });
      }
      await batch.commit();
      setSyncMessage("✅ Sincronização concluída com sucesso!");
    } catch (error) {
      console.error("Erro na sincronização:", error);
      setSyncMessage("❌ Erro ao sincronizar. Verifique a chave da API ou a conexão.");
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMessage(""), 5000);
    }
  };

  if (loading) return <div className="loader-full">Carregando...</div>;

  if (!user) {
    return (
      <div className="landing-container">
        <div className="hero-section">
          <div className="hero-icon">⚽🏆</div>
          <h1>Bolão Copa do Mundo <span>2026</span></h1>
          <p>Palpite os placares, acumule pontos e dispute o ranking com seus amigos.</p>
          <button onClick={() => signInWithPopup(auth, googleProvider)} className="google-btn-hero">
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" />
            Entrar com Google
          </button>
          <div className="email-divider">ou</div>
          <button onClick={() => setShowEmailModal(true)} className="email-btn-hero">
            📧 Entrar com e-mail e senha
          </button>
          <p className="hero-note">Gratuito • Sem anúncios • Dados oficiais da API-FOOTBALL</p>
        </div>
        <div className="ranking-public"><Ranking /></div>
        <div className="groups-public"><GroupStandings /></div>
        {showEmailModal && <EmailLogin onClose={() => setShowEmailModal(false)} />}
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="logo" onClick={() => setCurrentView("matches")} style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "1rem" }}>
          <img src="/worldcup2026-logo.png" alt="Logo Copa 2026" className="worldcup-logo" />
          <h1>Bolão <span>Copa 2026</span></h1>
        </div>
        <div className="user-info">
          <img src={user.photoURL} alt={user.displayName} className="user-avatar" />
          <span>{user.displayName}</span>
          <button onClick={() => setCurrentView("profile")} className="profile-nav-btn">👤 Perfil</button>
          {isAdmin && <button onClick={() => setCurrentView("admin")} className="admin-nav-btn">🔧 Admin</button>}
          <button onClick={() => signOut(auth)} className="logout-btn">Sair</button>
        </div>
      </header>
      <main className="main-content">
        {isAdmin && currentView !== "admin" && (
          <div className="admin-bar">
            <button onClick={handleSync} disabled={syncing} className="sync-btn">
              {syncing ? "Sincronizando..." : "🔄 Sincronizar jogos (API-FOOTBALL)"}
            </button>
            {syncMessage && <span className="sync-msg">{syncMessage}</span>}
          </div>
        )}
        {currentView === "matches" && <Matches user={user} />}
        {currentView === "profile" && <UserProfile user={user} />}
        {currentView === "admin" && isAdmin && <AdminPanel />}
      </main>
      <footer className="app-footer">
        <p>© 2026 Bolão Copa do Mundo – Palpites gratuitos • Dados via API-FOOTBALL</p>
      </footer>
    </div>
  );
}

export default App;