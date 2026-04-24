// src/components/KnockoutBracket.jsx
import { useState, useEffect } from "react";
import { collection, getDocs, doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { Flag } from "../utils/countryCodes";

export default function KnockoutBracket({ user }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bracket, setBracket] = useState({
    round16: [],
    quarter: [],
    semi: [],
    final: null,
    thirdPlace: null
  });

  // Carrega os jogos de mata‑mata da coleção 'matches' e os palpites salvos do usuário
  useEffect(() => {
    const fetchBracket = async () => {
      if (!user) return;
      try {
        // Buscar todos os jogos de mata‑mata (round16, quarter, semi, final, third_place)
        const matchesSnap = await getDocs(collection(db, "matches"));
        const knockoutMatches = [];
        matchesSnap.forEach(doc => {
          const data = doc.data();
          if (["round16", "quarter", "semi", "final", "third_place"].includes(data.round)) {
            knockoutMatches.push({ id: doc.id, ...data });
          }
        });
        // Ordenar por fase (round16 → quarter → semi → final → third_place)
        const order = { round16: 1, quarter: 2, semi: 3, final: 4, third_place: 5 };
        knockoutMatches.sort((a, b) => order[a.round] - order[b.round]);

        // Buscar palpites já salvos do usuário
        const predictionsDoc = await getDoc(doc(db, "knockoutPredictions", user.uid));
        const savedPredictions = predictionsDoc.exists() ? predictionsDoc.data() : {};

        // Construir o bracket com os jogos e os vencedores salvos
        const round16 = knockoutMatches.filter(m => m.round === "round16").map(m => ({
          ...m,
          winner: savedPredictions[m.id]?.winner || null
        }));
        const quarter = knockoutMatches.filter(m => m.round === "quarter").map(m => ({
          ...m,
          winner: savedPredictions[m.id]?.winner || null
        }));
        const semi = knockoutMatches.filter(m => m.round === "semi").map(m => ({
          ...m,
          winner: savedPredictions[m.id]?.winner || null
        }));
        const final = knockoutMatches.find(m => m.round === "final");
        const thirdPlace = knockoutMatches.find(m => m.round === "third_place");

        setBracket({
          round16,
          quarter,
          semi,
          final: final ? { ...final, winner: savedPredictions[final.id]?.winner || null } : null,
          thirdPlace: thirdPlace ? { ...thirdPlace, winner: savedPredictions[thirdPlace.id]?.winner || null } : null,
        });
      } catch (error) {
        console.error("Erro ao carregar bracket:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchBracket();
  }, [user]);

  // Atualiza o vencedor de um jogo e propaga para as próximas fases (se necessário)
  const updateWinner = async (matchId, winner, round) => {
    setSaving(true);
    try {
      // 1. Atualizar localmente
      let newRound16 = [...bracket.round16];
      let newQuarter = [...bracket.quarter];
      let newSemi = [...bracket.semi];
      let newFinal = bracket.final ? { ...bracket.final } : null;
      let newThirdPlace = bracket.thirdPlace ? { ...bracket.thirdPlace } : null;

      if (round === "round16") {
        newRound16 = newRound16.map(m => m.id === matchId ? { ...m, winner } : m);
        // Recalcular quartas baseado nos vencedores das oitavas (mapeamento fixo por ordem)
        const winners = newRound16.filter(m => m.winner).map(m => m.winner);
        // O mapeamento dos confrontos das quartas depende da ordem dos jogos
        // Vamos usar a ordem original dos jogos que vieram do Firestore
        newQuarter = newQuarter.map((m, idx) => ({
          ...m,
          homeTeam: winners[idx * 2] || m.homeTeam,
          awayTeam: winners[idx * 2 + 1] || m.awayTeam,
          winner: (winners[idx * 2] && winners[idx * 2 + 1]) ? null : m.winner
        }));
      } else if (round === "quarter") {
        newQuarter = newQuarter.map(m => m.id === matchId ? { ...m, winner } : m);
        const winners = newQuarter.filter(m => m.winner).map(m => m.winner);
        newSemi = newSemi.map((m, idx) => ({
          ...m,
          homeTeam: winners[idx * 2] || m.homeTeam,
          awayTeam: winners[idx * 2 + 1] || m.awayTeam,
          winner: (winners[idx * 2] && winners[idx * 2 + 1]) ? null : m.winner
        }));
      } else if (round === "semi") {
        newSemi = newSemi.map(m => m.id === matchId ? { ...m, winner } : m);
        const winners = newSemi.filter(m => m.winner).map(m => m.winner);
        if (winners.length >= 2) {
          newFinal = {
            ...newFinal,
            homeTeam: winners[0],
            awayTeam: winners[1],
            winner: null
          };
          // Disputa de terceiro lugar (perdedores das semi)
          const losers = newSemi.filter(m => m.winner).map(m => m.winner === m.homeTeam ? m.awayTeam : m.homeTeam);
          if (losers.length >= 2) {
            newThirdPlace = {
              ...newThirdPlace,
              homeTeam: losers[0],
              awayTeam: losers[1],
              winner: null
            };
          }
        }
      } else if (round === "final") {
        newFinal = { ...newFinal, winner };
      } else if (round === "third_place") {
        newThirdPlace = { ...newThirdPlace, winner };
      }

      const updatedBracket = {
        round16: newRound16,
        quarter: newQuarter,
        semi: newSemi,
        final: newFinal,
        thirdPlace: newThirdPlace
      };
      setBracket(updatedBracket);

      // 2. Salvar no Firestore (apenas os vencedores)
      const predictionsToSave = {};
      [...newRound16, ...newQuarter, ...newSemi, newFinal, newThirdPlace].forEach(match => {
        if (match && match.winner) {
          predictionsToSave[match.id] = { winner: match.winner };
        }
      });
      await setDoc(doc(db, "knockoutPredictions", user.uid), predictionsToSave);
    } catch (error) {
      console.error("Erro ao salvar palpite:", error);
    } finally {
      setSaving(false);
    }
  };

  // Renderiza um jogo
  const renderMatch = (match, roundName) => {
    if (!match) return null;

    // Se o time for "TBD", exibe uma mensagem descritiva
    const homeDisplay = match.homeTeam === "TBD" ? "Vencedor do jogo anterior" : match.homeTeam;
    const awayDisplay = match.awayTeam === "TBD" ? "Vencedor do jogo anterior" : match.awayTeam;

    return (
      <div key={match.id} className="bracket-match">
        <div className="bracket-teams">
          <div className={`team ${match.winner === match.homeTeam ? "winner" : ""}`}>
            <Flag teamName={match.homeTeam} size={24} />
            <span>{homeDisplay}</span>
          </div>
          <div className="vs">vs</div>
          <div className={`team ${match.winner === match.awayTeam ? "winner" : ""}`}>
            <Flag teamName={match.awayTeam} size={24} />
            <span>{awayDisplay}</span>
          </div>
        </div>
        <select
          value={match.winner || ""}
          onChange={(e) => updateWinner(match.id, e.target.value, match.round)}
          disabled={!match.homeTeam || !match.awayTeam || match.homeTeam === "TBD" || match.awayTeam === "TBD"}
          className="winner-select"
        >
          <option value="">Selecione o vencedor</option>
          {match.homeTeam && match.homeTeam !== "TBD" && <option value={match.homeTeam}>{match.homeTeam}</option>}
          {match.awayTeam && match.awayTeam !== "TBD" && <option value={match.awayTeam}>{match.awayTeam}</option>}
        </select>
      </div>
    );
  };

  if (loading) return <div className="loading">Carregando chave do mata‑mata...</div>;

  return (
    <div className="knockout-bracket-container">
      <h2>🏆 Mata‑Mata – Palpites de quem avança</h2>
      {saving && <div className="saving-indicator">💾 Salvando automaticamente...</div>}
      <div className="bracket">
        <div className="bracket-round">
          <h4>Oitavas de final</h4>
          {bracket.round16.map(match => renderMatch(match, "Oitavas"))}
        </div>
        <div className="bracket-round">
          <h4>Quartas de final</h4>
          {bracket.quarter.map(match => renderMatch(match, "Quartas"))}
        </div>
        <div className="bracket-round">
          <h4>Semifinais</h4>
          {bracket.semi.map(match => renderMatch(match, "Semifinal"))}
        </div>
        <div className="bracket-round">
          <h4>Final</h4>
          {bracket.final && renderMatch(bracket.final, "Final")}
          {bracket.thirdPlace && renderMatch(bracket.thirdPlace, "Disputa 3º lugar")}
        </div>
      </div>
      <div className="info-note">
        <p>💡 Os confrontos são definidos pelo administrador. Acompanhe os resultados reais para prever os vencedores.</p>
      </div>
    </div>
  );
}