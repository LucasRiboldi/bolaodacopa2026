// src/components/AdminPanel.jsx
import { useState, useEffect } from "react";
import { collection, getDocs, doc, setDoc, updateDoc, getDoc, writeBatch, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";
import { Flag } from "../utils/countryCodes";
import { groups, allTeams } from "../utils/groupConfig";
import { calculateAllScores } from "../utils/scoringEngine";

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState("groups");
  const [users, setUsers] = useState([]);
  const [groupMatches, setGroupMatches] = useState([]);
  // FUTURO: knockoutMatches será usado quando o mata‑mata for implementado
  // const [knockoutMatches, setKnockoutMatches] = useState({ round16: [], quarter: [], semi: [], final: [] });
  const [scoring, setScoring] = useState({
    exactScore: 6, correctResult: 2, twoCorrectClassified: 5, oneCorrectClassified: 2, correctOrderBonus: 3,
    /* FUTURO: round16: 4, quarter: 6, semi: 10, finalWinner: 12, semiFinalistEach: 5, finalistEach: 7, champion: 12 */
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const usersSnap = await getDocs(collection(db, "users"));
        const usersList = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const predictionsSnap = await getDocs(collection(db, "predictions"));
        const predCount = {};
        predictionsSnap.forEach(doc => { predCount[doc.data().userId] = (predCount[doc.data().userId] || 0) + 1; });
        // FUTURO: knockoutSnap removido por enquanto
        setUsers(usersList.map(u => ({ ...u, predictionsCount: predCount[u.id] || 0 })));

        const configDoc = await getDoc(doc(db, "config", "scoring"));
        if (configDoc.exists()) setScoring(configDoc.data());

        await refreshMatches();
      } catch (error) { console.error(error); } finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const refreshMatches = async () => {
    const matchesSnap = await getDocs(collection(db, "matches"));
    const allMatches = matchesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setGroupMatches(allMatches.filter(m => m.round === "group" || !m.round));
    // FUTURO: setKnockoutMatches({ round16: allMatches.filter(m => m.round === "round16"), ... });
  };

  const saveScoring = async () => {
    try { await setDoc(doc(db, "config", "scoring"), scoring); setMessage("✅ Critérios salvos!"); setTimeout(() => setMessage(""), 3000); } 
    catch (error) { setMessage("❌ Erro ao salvar."); }
  };

  const updateMatchResult = async (matchId, homeScore, awayScore) => {
    try {
      const matchRef = doc(db, "matches", matchId);
      const matchSnap = await getDoc(matchRef);
      const matchData = matchSnap.data();
      let updateData = { homeScore: parseInt(homeScore) || null, awayScore: parseInt(awayScore) || null };
      
      if (!matchData.startTime || isNaN(new Date(matchData.startTime).getTime())) {
        const defaultStart = new Date(2026, 5, 11, 12, 0, 0);
        updateData.startTime = defaultStart.toISOString();
        updateData.date = defaultStart.toISOString().split('T')[0];
        updateData.time = "12:00";
      }
      await updateDoc(matchRef, updateData);
      setMessage("✅ Resultado atualizado!");
      refreshMatches();
    } catch (error) { setMessage("❌ Erro ao atualizar."); }
  };

  const deleteMatch = async (matchId) => {
    if (window.confirm("Remover este jogo permanentemente?")) { await deleteDoc(doc(db, "matches", matchId)); setMessage("✅ Jogo removido"); refreshMatches(); }
  };

  const createGroupStageMatches = async () => {
    setMessage("🚀 Criando 72 jogos da fase de grupos...");
    let total = 0;
    try {
      const baseDate = new Date(2026, 5, 11, 13, 0, 0);
      let matchCounter = 0;
      for (const [group, teams] of Object.entries(groups)) {
        for (let i = 0; i < teams.length; i++) {
          for (let j = i + 1; j < teams.length; j++) {
            const id = `${group}_${teams[i]}_vs_${teams[j]}`.replace(/\s/g, '_');
            const gameDate = new Date(baseDate);
            gameDate.setDate(baseDate.getDate() + Math.floor(matchCounter / 6));
            gameDate.setHours(13 + (matchCounter % 6) * 2, 0, 0, 0);
            const startTimeISO = gameDate.toISOString();
            await setDoc(doc(db, "matches", id), {
              id, round: "group", group, homeTeam: teams[i], awayTeam: teams[j],
              homeScore: null, awayScore: null, date: startTimeISO.split('T')[0],
              time: `${gameDate.getHours().toString().padStart(2,'0')}:00`,
              stadium: "A definir", startTime: startTimeISO, status: "Not Started",
            });
            total++;
            matchCounter++;
          }
        }
      }
      setMessage(`✅ ${total} jogos criados com sucesso!`);
      refreshMatches();
    } catch (error) { console.error(error); setMessage("❌ Erro ao criar os jogos."); } finally { setTimeout(() => setMessage(""), 3000); }
  };

  // FUTURO: createKnockoutMatches, addKnockoutMatch serão implementados depois

  const importMatchesFromJSON = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setImporting(true);
    setMessage("📂 Lendo arquivo JSON...");
    try {
      const text = await file.text();
      const matchesData = JSON.parse(text);
      if (!Array.isArray(matchesData)) throw new Error("Arquivo JSON deve conter um array de jogos.");
      setMessage(`📋 ${matchesData.length} jogos encontrados. Importando...`);
      let batch = writeBatch(db);
      let count = 0;
      let commitCount = 0;
      for (const match of matchesData) {
        if (!match.id) continue;
        let validStartTime = match.startTime;
        if (!validStartTime || isNaN(new Date(validStartTime).getTime())) {
          const defaultDate = new Date(2026, 5, 11, 12, 0);
          validStartTime = defaultDate.toISOString();
          match.startTime = validStartTime;
          match.date = validStartTime.split('T')[0];
          match.time = "12:00";
        }
        batch.set(doc(db, "matches", match.id), match, { merge: true });
        count++;
        if (count % 500 === 0) {
          await batch.commit();
          commitCount++;
          setMessage(`🔄 Lote ${commitCount} commitado (${count} documentos)`);
          batch = writeBatch(db);
        }
      }
      if (count % 500 !== 0) await batch.commit();
      setMessage(`✅ Importação concluída! ${count} jogos atualizados/criados.`);
      refreshMatches();
    } catch (error) {
      console.error(error);
      setMessage(`❌ Erro ao importar: ${error.message}`);
    } finally {
      setImporting(false);
      event.target.value = "";
      setTimeout(() => setMessage(""), 5000);
    }
  };

  const calculateFullRanking = async () => {
    setMessage("🔄 Calculando pontuação total...");
    try {
      const scoresMap = await calculateAllScores();
      const batch = writeBatch(db);
      for (const [userId, score] of scoresMap.entries()) {
        batch.set(doc(db, "rankings", userId), {
          userId,
          totalPoints: score.total,
          details: score.details,
          updatedAt: new Date().toISOString()
        });
      }
      await batch.commit();
      setMessage(`✅ Ranking calculado para ${scoresMap.size} usuários!`);
    } catch (error) {
      console.error(error);
      setMessage("❌ Erro ao calcular pontuação total.");
    }
  };

  if (loading) return <div>Carregando painel...</div>;

  const MatchList = ({ matches, roundTitle, allowDelete = false }) => {
    return (
      <div className="admin-section">
        <h3 className="admin-section-title">{roundTitle}</h3>
        {matches.length === 0 && <p className="admin-empty">Nenhum jogo cadastrado nesta fase.</p>}
        <div className="matches-admin-list">
          {matches.map(match => (
            <div key={match.id} className="match-edit-card">
              <div className="match-info">
                <div className="team-with-flag"><Flag teamName={match.homeTeam} size={28} /><strong>{match.homeTeam}</strong></div>
                <span>vs</span>
                <div className="team-with-flag"><Flag teamName={match.awayTeam} size={28} /><strong>{match.awayTeam}</strong></div>
                <div className="match-datetime">
                  {match.startTime && !isNaN(new Date(match.startTime).getTime()) ? 
                    `${new Date(match.startTime).toLocaleDateString()} ${new Date(match.startTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}` : 
                    "Data inválida"}
                </div>
              </div>
              <div className="score-edit">
                <input type="number" placeholder="gols casa" defaultValue={match.homeScore ?? ""} onBlur={(e) => updateMatchResult(match.id, e.target.value, match.awayScore)} />
                <input type="number" placeholder="gols fora" defaultValue={match.awayScore ?? ""} onBlur={(e) => updateMatchResult(match.id, match.homeScore, e.target.value)} />
                {allowDelete && <button className="delete-btn" onClick={() => deleteMatch(match.id)}>🗑️</button>}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="admin-panel">
      <h1 className="admin-panel-title">🔧 Painel do Administrador</h1>
      {message && <div className="admin-message">{message}</div>}
      <div className="admin-tabs">
        <button className={activeTab === "groups" ? "active" : ""} onClick={() => setActiveTab("groups")}>📋 Fase de Grupos</button>
        {/* FUTURO: <button className={activeTab === "knockout" ? "active" : ""} onClick={() => setActiveTab("knockout")}>🏆 Mata‑Mata</button> */}
        <button className={activeTab === "settings" ? "active" : ""} onClick={() => setActiveTab("settings")}>⚙️ Configurações</button>
        <button className={activeTab === "users" ? "active" : ""} onClick={() => setActiveTab("users")}>👥 Usuários</button>
      </div>

      {activeTab === "groups" && (
        <>
          <div className="admin-actions-bar">
            <button onClick={createGroupStageMatches} className="btn-admin-primary">🏁 Criar 72 jogos da fase de grupos</button>
            <label className="btn-admin-secondary">
              📂 Importar jogos (JSON)
              <input type="file" accept=".json" onChange={importMatchesFromJSON} disabled={importing} style={{ display: "none" }} />
            </label>
            {importing && <span>⏳ Importando...</span>}
          </div>
          <MatchList matches={groupMatches} roundTitle="📋 Jogos da Fase de Grupos" allowDelete />
        </>
      )}

      {/* FUTURO: seção de mata‑mata removida */}

      {activeTab === "settings" && (
        <div className="admin-section settings-grid">
          <h2>⚙️ Configuração de Pontuação</h2>
          <p className="settings-description">Defina os pontos para cada tipo de acerto.</p>
          <div className="scoring-category"><h3>📌 Fase de grupos (por jogo)</h3>
            <div className="scoring-row"><label>Placar exato:</label><input type="number" value={scoring.exactScore} onChange={e => setScoring({...scoring, exactScore: parseInt(e.target.value)})} /><span className="hint">pontos</span></div>
            <div className="scoring-row"><label>Resultado correto (vitória/empate):</label><input type="number" value={scoring.correctResult} onChange={e => setScoring({...scoring, correctResult: parseInt(e.target.value)})} /><span className="hint">pontos</span></div>
          </div>
          <div className="scoring-category"><h3>🏆 Classificação dos grupos</h3>
            <div className="scoring-row"><label>Acertar os dois classificados (sem ordem):</label><input type="number" value={scoring.twoCorrectClassified} onChange={e => setScoring({...scoring, twoCorrectClassified: parseInt(e.target.value)})} /></div>
            <div className="scoring-row"><label>Acertar apenas um classificado:</label><input type="number" value={scoring.oneCorrectClassified} onChange={e => setScoring({...scoring, oneCorrectClassified: parseInt(e.target.value)})} /></div>
            <div className="scoring-row"><label>Bônus por ordem correta (1º e 2º lugares):</label><input type="number" value={scoring.correctOrderBonus} onChange={e => setScoring({...scoring, correctOrderBonus: parseInt(e.target.value)})} /></div>
          </div>
          {/* FUTURO: seções de mata‑mata e bônus serão adicionadas */}
          <div className="scoring-actions">
            <button onClick={saveScoring} className="btn-admin-secondary">💾 Salvar todas as configurações</button>
            <button onClick={calculateFullRanking} className="btn-admin-primary">🏆 Calcular pontuação TOTAL</button>
          </div>
        </div>
      )}

      {activeTab === "users" && (
        <div className="admin-section users-section">
          <h2>👥 Usuários cadastrados</h2>
          <div className="users-table-responsive">
            <table className="admin-users-table">
              <thead>
                <tr><th>Nome</th><th>E-mail</th><th>Palpites (jogos)</th><th>Último palpite</th></tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td>{u.displayName || "—"}</td>
                    <td>{u.email || "—"}</td>
                    <td className={u.predictionsCount > 0 ? "has-bets" : "no-bets"}>{u.predictionsCount}</td>
                    <td>{u.lastPredictionDate ? new Date(u.lastPredictionDate).toLocaleDateString() : "—"}</td>
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