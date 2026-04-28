import { useEffect, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase";
import { Flag } from "../utils/countryCodes";
import { groups } from "../utils/groupConfig";
import { calculateAllScores } from "../utils/scoringEngine";

const DEFAULT_SCORING = {
  exactScore: 6,
  correctResult: 2,
  twoCorrectClassified: 5,
  oneCorrectClassified: 2,
  correctOrderBonus: 3,
};

const parseScoreInput = (value) => {
  if (value === "" || value === null || value === undefined) {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
};

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState("groups");
  const [users, setUsers] = useState([]);
  const [groupMatches, setGroupMatches] = useState([]);
  const [scoring, setScoring] = useState(DEFAULT_SCORING);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const usersSnapshot = await getDocs(collection(db, "users"));
        const usersList = usersSnapshot.docs.map((userDoc) => ({
          id: userDoc.id,
          ...userDoc.data(),
        }));

        const predictionsSnapshot = await getDocs(collection(db, "predictions"));
        const predictionCount = {};
        predictionsSnapshot.forEach((predictionDoc) => {
          const prediction = predictionDoc.data();
          predictionCount[prediction.userId] = (predictionCount[prediction.userId] || 0) + 1;
        });

        setUsers(
          usersList.map((user) => ({
            ...user,
            predictionsCount: predictionCount[user.id] || 0,
          })),
        );

        const configSnapshot = await getDoc(doc(db, "config", "scoring"));
        if (configSnapshot.exists()) {
          setScoring({ ...DEFAULT_SCORING, ...configSnapshot.data() });
        }

        await refreshMatches();
      } catch (error) {
        console.error("Erro ao carregar painel admin:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const refreshMatches = async () => {
    const matchesSnapshot = await getDocs(collection(db, "matches"));
    const allMatches = matchesSnapshot.docs.map((matchDoc) => ({
      id: matchDoc.id,
      ...matchDoc.data(),
    }));

    setGroupMatches(
      allMatches
        .filter((match) => match.round === "group" || !match.round)
        .sort((first, second) => new Date(first.startTime || 0) - new Date(second.startTime || 0)),
    );
  };

  const saveScoring = async () => {
    try {
      await setDoc(doc(db, "config", "scoring"), scoring);
      setMessage("Criterios salvos com sucesso.");
      window.setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      console.error("Erro ao salvar configuracao:", error);
      setMessage("Erro ao salvar criterios.");
    }
  };

  const updateMatchResult = async (matchId, nextHomeScore, nextAwayScore) => {
    const homeScore = parseScoreInput(nextHomeScore);
    const awayScore = parseScoreInput(nextAwayScore);

    if ((nextHomeScore !== "" && homeScore === null) || (nextAwayScore !== "" && awayScore === null)) {
      setMessage("Use apenas placares inteiros maiores ou iguais a zero.");
      return;
    }

    try {
      const matchRef = doc(db, "matches", matchId);
      const matchSnapshot = await getDoc(matchRef);
      if (!matchSnapshot.exists()) {
        setMessage("Jogo nao encontrado.");
        return;
      }

      const matchData = matchSnapshot.data();
      const updateData = {
        homeScore,
        awayScore,
      };

      if (!matchData.startTime || Number.isNaN(new Date(matchData.startTime).getTime())) {
        const defaultStart = new Date(Date.UTC(2026, 5, 11, 15, 0, 0));
        updateData.startTime = defaultStart.toISOString();
        updateData.date = defaultStart.toISOString().split("T")[0];
        updateData.time = "12:00";
      }

      await updateDoc(matchRef, updateData);
      setMessage("Resultado atualizado.");
      await refreshMatches();
    } catch (error) {
      console.error("Erro ao atualizar resultado:", error);
      setMessage("Erro ao atualizar resultado.");
    }
  };

  const deleteMatch = async (matchId) => {
    if (!window.confirm("Remover este jogo permanentemente?")) {
      return;
    }

    await deleteDoc(doc(db, "matches", matchId));
    setMessage("Jogo removido.");
    await refreshMatches();
  };

  const createGroupStageMatches = async () => {
    setMessage("Criando jogos da fase de grupos...");

    try {
      const baseDate = new Date(Date.UTC(2026, 5, 11, 16, 0, 0));
      let total = 0;
      let matchCounter = 0;

      for (const [group, teams] of Object.entries(groups)) {
        for (let homeIndex = 0; homeIndex < teams.length; homeIndex += 1) {
          for (let awayIndex = homeIndex + 1; awayIndex < teams.length; awayIndex += 1) {
            const gameDate = new Date(baseDate);
            gameDate.setUTCDate(baseDate.getUTCDate() + Math.floor(matchCounter / 6));
            gameDate.setUTCHours(16 + (matchCounter % 6) * 2, 0, 0, 0);

            const id = `${group}_${teams[homeIndex]}_vs_${teams[awayIndex]}`.replace(/\s/g, "_");
            await setDoc(doc(db, "matches", id), {
              id,
              round: "group",
              group,
              homeTeam: teams[homeIndex],
              awayTeam: teams[awayIndex],
              homeScore: null,
              awayScore: null,
              date: gameDate.toISOString().split("T")[0],
              time: gameDate.toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
                timeZone: "America/Sao_Paulo",
              }),
              stadium: "A definir",
              startTime: gameDate.toISOString(),
              status: "Not Started",
            });

            total += 1;
            matchCounter += 1;
          }
        }
      }

      setMessage(`${total} jogos criados com sucesso.`);
      await refreshMatches();
    } catch (error) {
      console.error("Erro ao criar jogos:", error);
      setMessage("Erro ao criar jogos.");
    } finally {
      window.setTimeout(() => setMessage(""), 3000);
    }
  };

  const importMatchesFromJSON = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setImporting(true);
    setMessage("Lendo arquivo JSON...");

    try {
      const text = await file.text();
      const matchesData = JSON.parse(text);

      if (!Array.isArray(matchesData)) {
        throw new Error("O arquivo JSON precisa conter um array de jogos.");
      }

      let batch = writeBatch(db);
      let count = 0;

      for (const match of matchesData) {
        if (!match.id) {
          continue;
        }

        const validStartTime = match.startTime && !Number.isNaN(new Date(match.startTime).getTime())
          ? match.startTime
          : new Date(Date.UTC(2026, 5, 11, 15, 0, 0)).toISOString();

        batch.set(doc(db, "matches", match.id), {
          ...match,
          startTime: validStartTime,
          date: match.date || validStartTime.split("T")[0],
          time: match.time || "12:00",
        }, { merge: true });

        count += 1;

        if (count % 500 === 0) {
          await batch.commit();
          batch = writeBatch(db);
        }
      }

      if (count % 500 !== 0) {
        await batch.commit();
      }

      setMessage(`Importacao concluida: ${count} jogos atualizados.`);
      await refreshMatches();
    } catch (error) {
      console.error("Erro ao importar jogos:", error);
      setMessage(`Erro ao importar jogos: ${error.message}`);
    } finally {
      setImporting(false);
      event.target.value = "";
      window.setTimeout(() => setMessage(""), 5000);
    }
  };

  const calculateFullRanking = async () => {
    setMessage("Calculando ranking...");

    try {
      const scoresMap = await calculateAllScores();
      const batch = writeBatch(db);

      for (const [userId, score] of scoresMap.entries()) {
        batch.set(doc(db, "rankings", userId), {
          userId,
          totalPoints: score.total,
          details: score.details,
          updatedAt: new Date().toISOString(),
        });
      }

      await batch.commit();
      setMessage(`Ranking recalculado para ${scoresMap.size} usuarios.`);
    } catch (error) {
      console.error("Erro ao recalcular ranking:", error);
      setMessage("Erro ao calcular ranking.");
    }
  };

  if (loading) {
    return <div>Carregando painel...</div>;
  }

  const MatchList = ({ matches, roundTitle, allowDelete = false }) => (
    <div className="admin-section">
      <h3 className="admin-section-title">{roundTitle}</h3>
      {matches.length === 0 && <p className="admin-empty">Nenhum jogo cadastrado nesta fase.</p>}
      <div className="matches-admin-list">
        {matches.map((match) => (
          <div key={match.id} className="match-edit-card">
            <div className="match-info">
              <div className="team-with-flag">
                <Flag teamName={match.homeTeam} size={28} />
                <strong>{match.homeTeam}</strong>
              </div>
              <span>vs</span>
              <div className="team-with-flag">
                <Flag teamName={match.awayTeam} size={28} />
                <strong>{match.awayTeam}</strong>
              </div>
              <div className="match-datetime">
                {match.startTime && !Number.isNaN(new Date(match.startTime).getTime())
                  ? `${new Date(match.startTime).toLocaleDateString("pt-BR")} ${new Date(match.startTime).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
                  : "Data invalida"}
              </div>
            </div>
            <div className="score-edit">
              <input
                type="number"
                min="0"
                placeholder="gols casa"
                defaultValue={match.homeScore ?? ""}
                onBlur={(event) => updateMatchResult(match.id, event.target.value, match.awayScore ?? "")}
              />
              <input
                type="number"
                min="0"
                placeholder="gols fora"
                defaultValue={match.awayScore ?? ""}
                onBlur={(event) => updateMatchResult(match.id, match.homeScore ?? "", event.target.value)}
              />
              {allowDelete && (
                <button className="delete-btn" onClick={() => deleteMatch(match.id)}>
                  Excluir
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="admin-panel">
      <h1 className="admin-panel-title">Painel do Administrador</h1>
      {message && <div className="admin-message">{message}</div>}

      <div className="admin-tabs">
        <button className={activeTab === "groups" ? "active" : ""} onClick={() => setActiveTab("groups")}>
          Fase de grupos
        </button>
        <button className={activeTab === "settings" ? "active" : ""} onClick={() => setActiveTab("settings")}>
          Configuracoes
        </button>
        <button className={activeTab === "users" ? "active" : ""} onClick={() => setActiveTab("users")}>
          Usuarios
        </button>
      </div>

      {activeTab === "groups" && (
        <>
          <div className="admin-actions-bar">
            <button onClick={createGroupStageMatches} className="btn-admin-primary">
              Criar 72 jogos da fase de grupos
            </button>
            <label className="btn-admin-secondary">
              Importar jogos (JSON)
              <input
                type="file"
                accept=".json"
                onChange={importMatchesFromJSON}
                disabled={importing}
                style={{ display: "none" }}
              />
            </label>
            {importing && <span>Importando...</span>}
          </div>
          <MatchList matches={groupMatches} roundTitle="Jogos da fase de grupos" allowDelete />
        </>
      )}

      {activeTab === "settings" && (
        <div className="admin-section settings-grid">
          <h2>Configuracao de pontuacao</h2>
          <p className="settings-description">Defina os pontos para cada tipo de acerto.</p>

          <div className="scoring-category">
            <h3>Fase de grupos</h3>
            <div className="scoring-row">
              <label>Placar exato:</label>
              <input
                type="number"
                min="0"
                value={scoring.exactScore}
                onChange={(event) => setScoring({ ...scoring, exactScore: Number(event.target.value) || 0 })}
              />
            </div>
            <div className="scoring-row">
              <label>Resultado correto:</label>
              <input
                type="number"
                min="0"
                value={scoring.correctResult}
                onChange={(event) => setScoring({ ...scoring, correctResult: Number(event.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="scoring-category">
            <h3>Classificacao dos grupos</h3>
            <div className="scoring-row">
              <label>Dois classificados certos:</label>
              <input
                type="number"
                min="0"
                value={scoring.twoCorrectClassified}
                onChange={(event) => setScoring({ ...scoring, twoCorrectClassified: Number(event.target.value) || 0 })}
              />
            </div>
            <div className="scoring-row">
              <label>Um classificado certo:</label>
              <input
                type="number"
                min="0"
                value={scoring.oneCorrectClassified}
                onChange={(event) => setScoring({ ...scoring, oneCorrectClassified: Number(event.target.value) || 0 })}
              />
            </div>
            <div className="scoring-row">
              <label>Bonus por ordem correta:</label>
              <input
                type="number"
                min="0"
                value={scoring.correctOrderBonus}
                onChange={(event) => setScoring({ ...scoring, correctOrderBonus: Number(event.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="scoring-actions">
            <button onClick={saveScoring} className="btn-admin-secondary">
              Salvar configuracoes
            </button>
            <button onClick={calculateFullRanking} className="btn-admin-primary">
              Recalcular ranking
            </button>
          </div>
        </div>
      )}

      {activeTab === "users" && (
        <div className="admin-section users-section">
          <h2>Usuarios cadastrados</h2>
          <div className="users-table-responsive">
            <table className="admin-users-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>E-mail</th>
                  <th>Palpites</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.displayName || "-"}</td>
                    <td>{user.email || "-"}</td>
                    <td className={user.predictionsCount > 0 ? "has-bets" : "no-bets"}>
                      {user.predictionsCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
