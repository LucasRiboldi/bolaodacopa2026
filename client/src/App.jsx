import { useEffect, useMemo, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { signOut } from "firebase/auth";
import { collection, doc, getDoc, writeBatch } from "firebase/firestore";
import axios from "axios";
import { auth, db, ensureUserDocument } from "./firebase";
import { getGroupByTeam } from "./utils/groupConfig";
import LandingPage from "./components/LandingPage";
import UserDashboard from "./components/UserDashboard";
import UserProfile from "./components/UserProfile";
import AdminPanel from "./components/AdminPanel";

const TEAM_NAME_MAP = {
  "United States": "USA",
  "Korea Republic": "South Korea",
  Czechia: "Czech Republic",
  "Bosnia-Herzegovina": "Bosnia and Herzegovina",
  "Cote d'Ivoire": "Ivory Coast",
  "Cape Verde Islands": "Cape Verde",
  "DR Congo": "DR Congo",
  Curacao: "Curacao",
};

const normalizeTeamName = (apiName) => TEAM_NAME_MAP[apiName] || apiName;

const resolveRound = (roundName = "") => {
  if (roundName.includes("Round of 16")) return "round16";
  if (roundName.includes("Quarter")) return "quarter";
  if (roundName.includes("Semi")) return "semi";
  if (roundName.includes("Final")) return "final";
  return "group";
};

function App() {
  const [user, loading] = useAuthState(auth);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentView, setCurrentView] = useState("dashboard");
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    const bootstrapSession = async () => {
      if (!user) {
        setIsAdmin(false);
        setUserProfile(null);
        setCurrentView("dashboard");
        return;
      }

      try {
        await ensureUserDocument(user);

        const [adminDoc, userDoc] = await Promise.all([
          getDoc(doc(db, "admins", user.uid)),
          getDoc(doc(db, "users", user.uid)),
        ]);

        setIsAdmin(adminDoc.exists());
        setUserProfile(userDoc.exists() ? userDoc.data() : null);
      } catch (error) {
        console.error("Erro ao iniciar sessao:", error);
        setIsAdmin(false);
      }
    };

    bootstrapSession();
  }, [user]);

  const displayName = useMemo(() => {
    if (!user) {
      return "";
    }

    return userProfile?.displayName || user.displayName || user.email?.split("@")[0] || "Apostador";
  }, [user, userProfile]);

  const handleSync = async () => {
    if (!isAdmin) {
      return;
    }

    setSyncing(true);
    setSyncMessage("Buscando jogos da Copa 2026 via API-FOOTBALL...");

    try {
      const apiKey = import.meta.env.VITE_API_FOOTBALL_KEY;
      if (!apiKey) {
        setSyncMessage("Chave da API-FOOTBALL nao configurada.");
        return;
      }

      const response = await axios.get("https://v3.football.api-sports.io/fixtures", {
        headers: { "x-apisports-key": apiKey },
        params: { league: 1, season: 2026 },
      });

      const fixtures = response.data?.response ?? [];
      if (fixtures.length === 0) {
        setSyncMessage("Nenhum jogo encontrado.");
        return;
      }

      const batch = writeBatch(db);
      const matchesRef = collection(db, "matches");

      for (const fixture of fixtures) {
        const homeTeam = normalizeTeamName(fixture.teams?.home?.name);
        const awayTeam = normalizeTeamName(fixture.teams?.away?.name);
        const round = resolveRound(fixture.league?.round);
        const group = round === "group" ? getGroupByTeam(homeTeam) || getGroupByTeam(awayTeam) : null;

        if (round === "group" && !group) {
          continue;
        }

        const id = `${round === "group" ? group : round}_${homeTeam}_vs_${awayTeam}`.replace(/\s/g, "_");

        batch.set(
          doc(matchesRef, id),
          {
            id,
            round,
            group,
            homeTeam,
            awayTeam,
            homeScore: fixture.goals?.home ?? null,
            awayScore: fixture.goals?.away ?? null,
            date: fixture.fixture?.date?.split("T")[0] ?? null,
            time: fixture.fixture?.date
              ? new Date(fixture.fixture.date).toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                  timeZone: "America/Sao_Paulo",
                })
              : null,
            stadium: fixture.fixture?.venue?.name ?? "A definir",
            startTime: fixture.fixture?.date ?? null,
            status: fixture.fixture?.status?.long || "Not Started",
          },
          { merge: true },
        );
      }

      await batch.commit();
      setSyncMessage(`Sincronizacao concluida: ${fixtures.length} jogos processados.`);
    } catch (error) {
      console.error("Erro ao sincronizar jogos:", error);
      setSyncMessage("Erro ao sincronizar jogos.");
    } finally {
      setSyncing(false);
      window.setTimeout(() => setSyncMessage(""), 5000);
    }
  };

  if (loading) {
    return <div className="loader-full">Carregando...</div>;
  }

  if (!user) {
    return <LandingPage />;
  }

  return (
    <div className="app">
      <header className="app-header">
        <button className="logo" onClick={() => setCurrentView("dashboard")}>
          <img src="/worldcup2026-logo.png" alt="Logo da Copa 2026" className="worldcup-logo" />
          <span className="logo-text">
            <strong>Bolao 2026</strong>
            <small>Copa do Mundo</small>
          </span>
        </button>

        <div className="header-user-shell">
          <nav className="dashboard-tabs dashboard-tabs--header">
            <button
              className={currentView === "dashboard" ? "active" : ""}
              onClick={() => setCurrentView("dashboard")}
            >
              Inicio
            </button>
            <button
              className={currentView === "profile" ? "active" : ""}
              onClick={() => setCurrentView("profile")}
            >
              Perfil
            </button>
            {isAdmin && (
              <button
                className={currentView === "admin" ? "active" : ""}
                onClick={() => setCurrentView("admin")}
              >
                Admin
              </button>
            )}
          </nav>

          <div className="user-info">
            <img
              src={user.photoURL || "/default-avatar.png"}
              alt={displayName}
              className="user-avatar"
            />
            <div className="user-meta">
              <strong>{displayName}</strong>
              <span>{isAdmin ? "Administrador" : "Apostador"}</span>
            </div>
            <button onClick={() => signOut(auth)} className="logout-btn">
              Sair
            </button>
          </div>
        </div>
      </header>

      {isAdmin && (
        <div className="admin-bar">
          <button onClick={handleSync} disabled={syncing} className="sync-btn">
            {syncing ? "Sincronizando..." : "Sincronizar jogos"}
          </button>
          {syncMessage && <span className="sync-msg">{syncMessage}</span>}
        </div>
      )}

      <main className="main-content">
        {currentView === "dashboard" && (
          <UserDashboard user={user} userProfile={userProfile} displayName={displayName} />
        )}
        {currentView === "profile" && (
          <UserProfile
            user={user}
            userProfile={userProfile}
            displayName={displayName}
            onProfileUpdate={setUserProfile}
          />
        )}
        {currentView === "admin" && isAdmin && <AdminPanel />}
      </main>
    </div>
  );
}

export default App;
