// src/components/KnockoutBracket.jsx
import { useState, useEffect } from "react";
import { collection, getDocs, doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { Flag } from "../utils/countryCodes";
import { getTeamNamePortuguese } from "../utils/teamNames";

export default function KnockoutBracket({ user }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bracket, setBracket] = useState({
    round16: [],
    quarter: [],
    semi: [],
    final: null,
    thirdPlace: null,
  });

  useEffect(() => {
    const fetchBracket = async () => {
      if (!user) return;
      try {
        const matchesSnap = await getDocs(collection(db, "matches"));
        const knockoutMatches = [];
        matchesSnap.forEach((doc) => {
          const data = doc.data();
          if (["round16", "quarter", "semi", "final", "third_place"].includes(data.round)) {
            knockoutMatches.push({ id: doc.id, ...data });
          }
        });
        const order = { round16: 1, quarter: 2, semi: 3, final: 4, third_place: 5 };
        knockoutMatches.sort((a, b) => order[a.round] - order[b.round]);

        const predictionsDoc = await getDoc(doc(db, "knockoutPredictions", user.uid));
        const savedPredictions = predictionsDoc.exists() ? predictionsDoc.data() : {};

        const round16 = knockoutMatches.filter((m) => m.round === "round16").map((m) => ({
          ...m,
          winner: savedPredictions[m.id]?.winner || null,
        }));
        const quarter = knockoutMatches.filter((m) => m.round === "quarter").map((m) => ({
          ...m,
          winner: savedPredictions[m.id]?.winner || null,
        }));
        const semi = knockoutMatches.filter((m) => m.round === "semi").map((m) => ({
          ...m,
          winner: savedPredictions[m.id]?.winner || null,
        }));
        const final = knockoutMatches.find((m) => m.round === "final");
        const thirdPlace = knockoutMatches.find((m) => m.round === "third_place");

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

  const updateWinner = async (matchId, winner, round) => {
    setSaving(true);
    try {
      let newRound16 = [...bracket.round16];
      let newQuarter = [...bracket.quarter];
      let newSemi = [...bracket.semi];
      let newFinal = bracket.final ? { ...bracket.final } : null;
      let newThirdPlace = bracket.thirdPlace ? { ...bracket.thirdPlace } : null;

      if (round === "round16") {
        newRound16 = newRound16.map((m) => (m.id === matchId ? { ...m, winner } : m));
        const winners = newRound16.filter((m) => m.winner).map((m) => m.winner);
        newQuarter = newQuarter.map((m, idx) => ({
          ...m,
          homeTeam: winners[idx * 2] || m.homeTeam,
          awayTeam: winners[idx * 2 + 1] || m.awayTeam,
          winner: winners[idx * 2] && winners[idx * 2 + 1] ? null : m.winner,
        }));
      } else if (round === "quarter") {
        newQuarter = newQuarter.map((m) => (m.id === matchId ? { ...m, winner } : m));
        const winners = newQuarter.filter((m) => m.winner).map((m) => m.winner);
        newSemi = newSemi.map((m, idx) => ({
          ...m,
          homeTeam: winners[idx * 2] || m.homeTeam,
          awayTeam: winners[idx * 2 + 1] || m.awayTeam,
          winner: winners[idx * 2] && winners[idx * 2 + 1] ? null : m.winner,
        }));
      } else if (round === "semi") {
        newSemi = newSemi.map((m) => (m.id === matchId ? { ...m, winner } : m));
        const winners = newSemi.filter((m) => m.winner).map((m) => m.winner);
        if (winners.length >= 2) {
          newFinal = { ...newFinal, homeTeam: winners[0], awayTeam: winners[1], winner: null };
          const losers = newSemi
            .filter((m) => m.winner)
            .map((m) => (m.winner === m.homeTeam ? m.awayTeam : m.homeTeam));
          if (losers.length >= 2) {
            newThirdPlace = { ...newThirdPlace, homeTeam: losers[0], awayTeam: losers[1], winner: null };
          }
        }
      } else if (round === "final") {
        newFinal = { ...newFinal, winner };
      } else if (round === "third_place") {
        newThirdPlace = { ...newThirdPlace, winner };
      }

      const updatedBracket = { round16: newRound16, quarter: newQuarter, semi: newSemi, final: newFinal, thirdPlace: newThirdPlace };
      setBracket(updatedBracket);

      const predictionsToSave = {};
      [...newRound16, ...newQuarter, ...newSemi, newFinal, newThirdPlace].forEach((match) => {
        if (match && match.winner) predictionsToSave[match.id] = { winner: match.winner };
      });
      await setDoc(doc(db, "knockoutPredictions", user.uid), predictionsToSave);
    } catch (error) {
      console.error("Erro ao salvar palpite:", error);
    } finally {
      setSaving(false);
    }
  };

  const renderMatch = (match, roundName) => {
    if (!match) return null;
    const homeName = getTeamNamePortuguese(match.homeTeam);
    const awayName = getTeamNamePortuguese(match.awayTeam);
    const homeDisplay = match.homeTeam === "TBD" ? "Vencedor do jogo anterior" : homeName;
    const awayDisplay = match.awayTeam === "TBD" ? "Vencedor do jogo anterior" : awayName;

    return (
      <div key={match.id} className="knockout-match-card">
        <div className="knockout-teams">
          <div className={`team ${match.winner === match.homeTeam ? "winner" : ""}`}>
            <Flag teamName={match.homeTeam} size={20} />
            <span>{homeDisplay}</span>
          </div>
          <div className="knockout-vs">VS</div>
          <div className={`team ${match.winner === match.awayTeam ? "winner" : ""}`}>
            <Flag teamName={match.awayTeam} size={20} />
            <span>{awayDisplay}</span>
          </div>
        </div>
        <select
          value={match.winner || ""}
          onChange={(e) => updateWinner(match.id, e.target.value, match.round)}
          disabled={!match.homeTeam || !match.awayTeam || match.homeTeam === "TBD" || match.awayTeam === "TBD"}
          className="knockout-select"
        >
          <option value="">Selecione o vencedor</option>
          {match.homeTeam && match.homeTeam !== "TBD" && <option value={match.homeTeam}>{homeName}</option>}
          {match.awayTeam && match.awayTeam !== "TBD" && <option value={match.awayTeam}>{awayName}</option>}
        </select>
      </div>
    );
  };

  if (loading) return <div className="loading">Carregando chave do mata‑mata...</div>;

  return (
    <div className="knockout-bracket-container">
      {saving && <div className="saving-alert">💾 Salvando automaticamente...</div>}
      <div className="knockout-bracket">
        <div className="knockout-round">
          <h4>Oitavas de final</h4>
          {bracket.round16.map((m) => renderMatch(m, "round16"))}
        </div>
        <div className="knockout-round">
          <h4>Quartas de final</h4>
          {bracket.quarter.map((m) => renderMatch(m, "quarter"))}
        </div>
        <div className="knockout-round">
          <h4>Semifinais</h4>
          {bracket.semi.map((m) => renderMatch(m, "semi"))}
        </div>
        <div className="knockout-round">
          <h4>Final</h4>
          {bracket.final && renderMatch(bracket.final, "final")}
          {bracket.thirdPlace && renderMatch(bracket.thirdPlace, "3º lugar")}
        </div>
      </div>
      <div className="knockout-info">
        <p>💡 Os confrontos são definidos pelo administrador. Acompanhe os resultados reais para prever os vencedores.</p>
      </div>
    </div>
  );
}