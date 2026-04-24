// src/components/AdminPanel.jsx
import { useState, useEffect } from "react";
import { collection, getDocs, doc, setDoc, updateDoc, getDoc, writeBatch, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";
import { Flag } from "../utils/countryCodes";
import { groups } from "../utils/groupConfig";

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState("groups");
  const [users, setUsers] = useState([]);
  const [groupMatches, setGroupMatches] = useState([]);
  const [knockoutMatches, setKnockoutMatches] = useState({ round16: [], quarter: [], semi: [], final: [] });
  const [scoring, setScoring] = useState({
    exactScore: 6, correctResult: 2, twoCorrectClassified: 5, oneCorrectClassified: 2, correctOrderBonus: 3,
    round16: 4, quarter: 6, semi: 10, finalWinner: 12, semiFinalistEach: 5, finalistEach: 7, champion: 12
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const usersSnap = await getDocs(collection(db, "users"));
        const usersList = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const predictionsSnap = await getDocs(collection(db, "predictions"));
        const predCount = {};
        predictionsSnap.forEach(doc => { predCount[doc.data().userId] = (predCount[doc.data().userId] || 0) + 1; });
        const knockoutSnap = await getDocs(collection(db, "knockoutPredictions"));
        const hasKnockout = new Set(knockoutSnap.docs.map(doc => doc.id));
        setUsers(usersList.map(u => ({ ...u, predictionsCount: predCount[u.id] || 0, hasKnockoutPrediction: hasKnockout.has(u.id) })));
        const configDoc = await getDoc(doc(db, "config", "scoring"));
        if (configDoc.exists()) setScoring(configDoc.data());
        const matchesSnap = await getDocs(collection(db, "matches"));
        const allMatches = matchesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setGroupMatches(allMatches.filter(m => m.round === "group" || !m.round));
        setKnockoutMatches({
          round16: allMatches.filter(m => m.round === "round16"),
          quarter: allMatches.filter(m => m.round === "quarter"),
          semi: allMatches.filter(m => m.round === "semi"),
          final: allMatches.filter(m => m.round === "final")
        });
      } catch (error) { console.error(error); } finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const saveScoring = async () => {
    try { await setDoc(doc(db, "config", "scoring"), scoring); setMessage("✅ Critérios salvos!"); setTimeout(() => setMessage(""), 3000); } 
    catch (error) { setMessage("❌ Erro ao salvar."); }
  };

  const updateMatchResult = async (matchId, homeScore, awayScore) => {
    try {
      await updateDoc(doc(db, "matches", matchId), { homeScore: parseInt(homeScore) || null, awayScore: parseInt(awayScore) || null });
      setMessage("✅ Resultado atualizado!");
      refreshMatches();
    } catch (error) { setMessage("❌ Erro ao atualizar."); }
  };

  const addKnockoutMatch = async (round, homeTeam, awayTeam, date, time, stadium) => {
    if (!homeTeam || !awayTeam) { setMessage("Preencha os dois times."); return; }
    try {
      const newId = `${round}_${Date.now()}`;
      await setDoc(doc(db, "matches", newId), { id: newId, round, homeTeam, awayTeam, homeScore: null, awayScore: null, date: date || "", time: time || "", stadium: stadium || "A definir", startTime: date ? new Date(`${date}T${time || "00:00"}`).toISOString() : null, status: "Not Started" });
      setMessage(`✅ Jogo adicionado na ${round}`);
      refreshMatches();
    } catch (error) { setMessage("❌ Erro ao adicionar jogo."); }
  };

  const deleteMatch = async (matchId) => {
    if (window.confirm("Remover este jogo permanentemente?")) { await deleteDoc(doc(db, "matches", matchId)); setMessage("✅ Jogo removido"); refreshMatches(); }
  };

  const refreshMatches = async () => {
    const matchesSnap = await getDocs(collection(db, "matches"));
    const allMatches = matchesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setGroupMatches(allMatches.filter(m => m.round === "group" || !m.round));
    setKnockoutMatches({
      round16: allMatches.filter(m => m.round === "round16"),
      quarter: allMatches.filter(m => m.round === "quarter"),
      semi: allMatches.filter(m => m.round === "semi"),
      final: allMatches.filter(m => m.round === "final")
    });
  };

  const createGroupStageMatches = async () => {
    setMessage("🚀 Criando 72 jogos da fase de grupos...");
    let total = 0;
    try {
      for (const [group, teams] of Object.entries(groups)) {
        for (let i = 0; i < teams.length; i++) {
          for (let j = i + 1; j < teams.length; j++) {
            const id = `${group}_${teams[i]}_vs_${teams[j]}`.replace(/\s/g, '_');
            await setDoc(doc(db, "matches", id), { id, round: "group", group, homeTeam: teams[i], awayTeam: teams[j], homeScore: null, awayScore: null, date: null, time: null, stadium: "A definir", startTime: null, status: "Not Started" });
            total++;
          }
        }
      }
      setMessage(`✅ ${total} jogos criados com sucesso!`);
      refreshMatches();
    } catch (error) { console.error(error); setMessage("❌ Erro ao criar os jogos."); } finally { setTimeout(() => setMessage(""), 3000); }
  };

  const calculateFullRanking = async () => {
    setMessage("🔄 Calculando pontuação total...");
    try {
      const points = (await getDoc(doc(db, "config", "scoring"))).data() || scoring;
      const matchesSnap = await getDocs(collection(db, "matches"));
      const matches = {};
      const finishedMatches = [];
      matchesSnap.forEach(doc => { const m = doc.data(); matches[doc.id] = m; if (m.homeScore !== null && m.awayScore !== null) finishedMatches.push(m); });

      // Classificação real dos grupos
      const groupResults = {};
      for (const [grp, teams] of Object.entries(groups)) {
        groupResults[grp] = {};
        teams.forEach(team => { groupResults[grp][team] = { played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, points: 0 }; });
      }
      finishedMatches.forEach(m => {
        if (m.round === "group" && m.group && groupResults[m.group]) {
          const g = groupResults[m.group];
          const home = m.homeTeam, away = m.awayTeam, hs = m.homeScore, as = m.awayScore;
          g[home].played++; g[away].played++;
          g[home].goalsFor += hs; g[home].goalsAgainst += as;
          g[away].goalsFor += as; g[away].goalsAgainst += hs;
          if (hs > as) { g[home].wins++; g[away].losses++; g[home].points += 3; }
          else if (as > hs) { g[away].wins++; g[home].losses++; g[away].points += 3; }
          else { g[home].draws++; g[away].draws++; g[home].points += 1; g[away].points += 1; }
        }
      });
      const realGroupOrder = {};
      for (const grp in groupResults) {
        const teams = Object.entries(groupResults[grp]).map(([name, stats]) => ({ name, ...stats, goalDifference: stats.goalsFor - stats.goalsAgainst }));
        teams.sort((a,b) => { if (a.points !== b.points) return b.points - a.points; if (a.goalDifference !== b.goalDifference) return b.goalDifference - a.goalDifference; return b.goalsFor - a.goalsFor; });
        realGroupOrder[grp] = teams.map(t => t.name);
      }

      // Vencedores reais mata-mata
      const knockoutWinners = { round16: {}, quarter: {}, semi: {}, final: null };
      finishedMatches.forEach(m => {
        if (["round16", "quarter", "semi", "final"].includes(m.round)) {
          const winner = m.homeScore > m.awayScore ? m.homeTeam : (m.awayScore > m.homeScore ? m.awayTeam : null);
          if (winner) knockoutWinners[m.round][m.id] = winner;
          if (m.round === "final") knockoutWinners.final = winner;
        }
      });
      const realSemifinalists = new Set();
      finishedMatches.filter(m => m.round === "semi").forEach(m => { realSemifinalists.add(m.homeTeam); realSemifinalists.add(m.awayTeam); });
      const finalMatch = finishedMatches.find(m => m.round === "final");
      const realFinalists = new Set();
      if (finalMatch) { realFinalists.add(finalMatch.homeTeam); realFinalists.add(finalMatch.awayTeam); }
      const realChampion = knockoutWinners.final;

      const usersSnap = await getDocs(collection(db, "users"));
      const userScores = {};
      usersSnap.forEach(doc => { userScores[doc.id] = { total: 0, exact: 0, result: 0, group: 0, knockout: 0, bonus: 0 }; });

      const predictionsSnap = await getDocs(collection(db, "predictions"));
      predictionsSnap.forEach(predDoc => {
        const pred = predDoc.data();
        const match = matches[pred.matchId];
        if (match && match.homeScore !== null && match.awayScore !== null) {
          let pts = 0;
          if (pred.homeScore === match.homeScore && pred.awayScore === match.awayScore) { pts = points.exactScore; userScores[pred.userId].exact++; }
          else {
            const predWinner = pred.homeScore > pred.awayScore ? "home" : pred.homeScore < pred.awayScore ? "away" : "draw";
            const realWinner = match.homeScore > match.awayScore ? "home" : match.homeScore < match.awayScore ? "away" : "draw";
            if (predWinner === realWinner) { pts = points.correctResult; userScores[pred.userId].result++; }
          }
          userScores[pred.userId].total += pts;
        }
      });

      const groupPredSnap = await getDocs(collection(db, "groupPredictions"));
      groupPredSnap.forEach(doc => {
        const data = doc.data();
        const userId = doc.id.split("_")[0];
        const group = doc.id.split("_")[1];
        const realOrder = realGroupOrder[group] || [];
        const userOrder = [data.first, data.second];
        let acertos = 0;
        if (userOrder[0] && realOrder.includes(userOrder[0])) acertos++;
        if (userOrder[1] && realOrder.includes(userOrder[1])) acertos++;
        let pts = 0;
        if (acertos === 2) pts = points.twoCorrectClassified;
        else if (acertos === 1) pts = points.oneCorrectClassified;
        if (acertos === 2 && userOrder[0] === realOrder[0] && userOrder[1] === realOrder[1]) pts += points.correctOrderBonus;
        userScores[userId].total += pts;
        userScores[userId].group += pts;
      });

      const koPredSnap = await getDocs(collection(db, "knockoutPredictions"));
      koPredSnap.forEach(doc => {
        const data = doc.data();
        const userId = doc.id;
        for (const round of ["round16", "quarter", "semi", "final"]) {
          const matchesArr = data[round];
          if (matchesArr && Array.isArray(matchesArr)) {
            matchesArr.forEach(m => {
              if (m.winner && knockoutWinners[round] && knockoutWinners[round][m.id] === m.winner) {
                let pts = 0;
                if (round === "round16") pts = points.round16;
                else if (round === "quarter") pts = points.quarter;
                else if (round === "semi") pts = points.semi;
                else if (round === "final") pts = points.finalWinner;
                userScores[userId].total += pts;
                userScores[userId].knockout += pts;
              }
            });
          } else if (round === "final" && data.final && data.final.winner && knockoutWinners.final === data.final.winner) {
            userScores[userId].total += points.finalWinner;
            userScores[userId].knockout += points.finalWinner;
          }
        }
      });

      const bonusPredSnap = await getDocs(collection(db, "bonusPredictions"));
      bonusPredSnap.forEach(doc => {
        const data = doc.data();
        const userId = doc.id;
        let pts = 0;
        if (data.semifinalists) data.semifinalists.forEach(team => { if (realSemifinalists.has(team)) pts += points.semiFinalistEach; });
        if (data.finalists) data.finalists.forEach(team => { if (realFinalists.has(team)) pts += points.finalistEach; });
        if (data.champion && data.champion === realChampion) pts += points.champion;
        userScores[userId].total += pts;
        userScores[userId].bonus += pts;
      });

      const batch = writeBatch(db);
      for (const [uid, scores] of Object.entries(userScores)) {
        batch.set(doc(db, "rankings", uid), { userId: uid, totalPoints: scores.total, details: { exact: scores.exact, result: scores.result, group: scores.group, knockout: scores.knockout, bonus: scores.bonus }, updatedAt: new Date().toISOString() });
      }
      await batch.commit();
      setMessage("✅ Pontuação total calculada e rankings atualizados!");
    } catch (error) { console.error(error); setMessage("❌ Erro ao calcular pontuação total."); }
  };

  if (loading) return <div>Carregando painel...</div>;

  const MatchList = ({ matches, roundTitle, allowDelete = false, showAddForm = false, onAdd }) => {
    const [newHome, setNewHome] = useState("");
    const [newAway, setNewAway] = useState("");
    const [newDate, setNewDate] = useState("");
    const [newTime, setNewTime] = useState("");
    const [newStadium, setNewStadium] = useState("");
    return (
      <div className="admin-section">
        <h3>{roundTitle}</h3>
        {matches.length === 0 && <p>Nenhum jogo cadastrado nesta fase.</p>}
        <div className="matches-admin-list">
          {matches.map(match => (
            <div key={match.id} className="match-edit-card">
              <div className="match-info">
                <div className="team-with-flag"><Flag teamName={match.homeTeam} size={28} /><strong>{match.homeTeam}</strong></div>
                <span>vs</span>
                <div className="team-with-flag"><Flag teamName={match.awayTeam} size={28} /><strong>{match.awayTeam}</strong></div>
                <div className="match-datetime">{match.date && <span>{match.date} {match.time}</span>}{match.stadium && <span>{match.stadium}</span>}</div>
              </div>
              <div className="score-edit">
                <input type="number" placeholder="gols casa" defaultValue={match.homeScore ?? ""} onBlur={(e) => updateMatchResult(match.id, e.target.value, match.awayScore)} />
                <input type="number" placeholder="gols fora" defaultValue={match.awayScore ?? ""} onBlur={(e) => updateMatchResult(match.id, match.homeScore, e.target.value)} />
                {allowDelete && <button className="delete-btn" onClick={() => deleteMatch(match.id)}>🗑️</button>}
              </div>
            </div>
          ))}
        </div>
        {showAddForm && (
          <div className="add-match-form">
            <h4>Adicionar novo jogo</h4>
            <input placeholder="Time da casa" value={newHome} onChange={e => setNewHome(e.target.value)} />
            <input placeholder="Time visitante" value={newAway} onChange={e => setNewAway(e.target.value)} />
            <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} />
            <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)} />
            <input placeholder="Estádio" value={newStadium} onChange={e => setNewStadium(e.target.value)} />
            <button onClick={() => onAdd(newHome, newAway, newDate, newTime, newStadium)}>➕ Adicionar</button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="admin-panel">
      <h1>🔧 Painel do Administrador</h1>
      {message && <div className="admin-message">{message}</div>}
      <div className="admin-tabs">
        <button className={activeTab === "groups" ? "active" : ""} onClick={() => setActiveTab("groups")}>📋 Fase de Grupos</button>
        <button className={activeTab === "knockout" ? "active" : ""} onClick={() => setActiveTab("knockout")}>🏆 Mata‑Mata</button>
        <button className={activeTab === "settings" ? "active" : ""} onClick={() => setActiveTab("settings")}>⚙️ Configurações</button>
        <button className={activeTab === "users" ? "active" : ""} onClick={() => setActiveTab("users")}>👥 Usuários</button>
      </div>
      {activeTab === "groups" && (
        <>
          <div style={{ marginBottom: "1rem" }}><button onClick={createGroupStageMatches} className="sync-btn">🏁 Criar 72 jogos da fase de grupos</button></div>
          <MatchList matches={groupMatches} roundTitle="📋 Jogos da Fase de Grupos" />
        </>
      )}
      {activeTab === "knockout" && (
        <div>
          <MatchList matches={knockoutMatches.round16} roundTitle="🏆 Oitavas de final" allowDelete showAddForm onAdd={(h,a,d,t,s) => addKnockoutMatch("round16", h, a, d, t, s)} />
          <MatchList matches={knockoutMatches.quarter} roundTitle="🏆 Quartas de final" allowDelete showAddForm onAdd={(h,a,d,t,s) => addKnockoutMatch("quarter", h, a, d, t, s)} />
          <MatchList matches={knockoutMatches.semi} roundTitle="🏆 Semifinais" allowDelete showAddForm onAdd={(h,a,d,t,s) => addKnockoutMatch("semi", h, a, d, t, s)} />
          <MatchList matches={knockoutMatches.final} roundTitle="🏆 Final" allowDelete showAddForm onAdd={(h,a,d,t,s) => addKnockoutMatch("final", h, a, d, t, s)} />
        </div>
      )}
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
          <div className="scoring-category"><h3>🥊 Mata‑mata (quem avança)</h3>
            <div className="scoring-row"><label>Oitavas de final:</label><input type="number" value={scoring.round16} onChange={e => setScoring({...scoring, round16: parseInt(e.target.value)})} /></div>
            <div className="scoring-row"><label>Quartas de final:</label><input type="number" value={scoring.quarter} onChange={e => setScoring({...scoring, quarter: parseInt(e.target.value)})} /></div>
            <div className="scoring-row"><label>Semifinal:</label><input type="number" value={scoring.semi} onChange={e => setScoring({...scoring, semi: parseInt(e.target.value)})} /></div>
            <div className="scoring-row"><label>Final (vencedor do jogo):</label><input type="number" value={scoring.finalWinner} onChange={e => setScoring({...scoring, finalWinner: parseInt(e.target.value)})} /></div>
          </div>
          <div className="scoring-category"><h3>🎁 Bônus finais</h3>
            <div className="scoring-row"><label>Acertar cada semifinalista:</label><input type="number" value={scoring.semiFinalistEach} onChange={e => setScoring({...scoring, semiFinalistEach: parseInt(e.target.value)})} /></div>
            <div className="scoring-row"><label>Acertar cada finalista:</label><input type="number" value={scoring.finalistEach} onChange={e => setScoring({...scoring, finalistEach: parseInt(e.target.value)})} /></div>
            <div className="scoring-row"><label>Acertar o campeão:</label><input type="number" value={scoring.champion} onChange={e => setScoring({...scoring, champion: parseInt(e.target.value)})} /></div>
          </div>
          <div className="scoring-actions">
            <button onClick={saveScoring} className="save-scoring-btn">💾 Salvar todas as configurações</button>
            <button onClick={calculateFullRanking} className="recalc-btn" style={{ background: "#2c6e2c", color: "white" }}>🏆 Calcular pontuação TOTAL</button>
          </div>
        </div>
      )}
      {activeTab === "users" && (
        <div className="admin-section users-section">
          <h2>👥 Usuários cadastrados</h2>
          <div className="users-table-responsive">
            <table className="users-table">
              <thead><tr><th>Nome</th><th>E-mail</th><th>Palpites (jogos)</th><th>Mata‑mata</th><th>Último palpite</th></tr></thead>
              <tbody>
                {users.map(u => <tr key={u.id}><td>{u.displayName || "—"}</td><td>{u.email || "—"}</td><td className={u.predictionsCount > 0 ? "has-bets" : "no-bets"}>{u.predictionsCount}</td><td>{u.hasKnockoutPrediction ? "✅ Sim" : "❌ Não"}</td><td>{u.lastPredictionDate ? new Date(u.lastPredictionDate).toLocaleDateString() : "—"}</td></tr>)}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}