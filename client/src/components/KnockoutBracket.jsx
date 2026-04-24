// src/components/KnockoutBracket.jsx
import { useState, useEffect } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { Flag } from "../utils/countryCodes";
import { groups } from "../utils/groupConfig";

export default function KnockoutBracket({ user }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [groupPredictions, setGroupPredictions] = useState({});
  const [bracket, setBracket] = useState({
    round16: [],
    quarter: [],
    semi: [],
    final: null
  });

  // Carregar palpites de classificação dos grupos
  useEffect(() => {
    const loadGroupPreds = async () => {
      if (!user) return;
      const preds = {};
      for (const group of Object.keys(groups)) {
        const docRef = doc(db, "groupPredictions", `${user.uid}_${group}`);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          preds[group] = snap.data();
        } else {
          preds[group] = { first: "", second: "" };
        }
      }
      setGroupPredictions(preds);
      // Carregar bracket salvo anteriormente
      const bracketDoc = await getDoc(doc(db, "knockoutPredictions", user.uid));
      if (bracketDoc.exists()) {
        setBracket(bracketDoc.data());
      } else {
        // Gerar chave inicial com base nos palpites de grupos
        generateInitialBracket(preds);
      }
      setLoading(false);
    };
    loadGroupPreds();
  }, [user]);

  // Gera os confrontos das oitavas com base nos 1º e 2º lugares de cada grupo
  const generateInitialBracket = (preds) => {
    // Mapeamento fixo dos cruzamentos (formato da Copa 2026)
    const matchups = [
      { winner: "A", runnerUp: "B" },
      { winner: "C", runnerUp: "D" },
      { winner: "E", runnerUp: "F" },
      { winner: "G", runnerUp: "H" },
      { winner: "B", runnerUp: "A" },
      { winner: "D", runnerUp: "C" },
      { winner: "F", runnerUp: "E" },
      { winner: "H", runnerUp: "G" },
      // Adicione os demais grupos conforme a chave oficial (I,J,K,L)
      { winner: "I", runnerUp: "J" },
      { winner: "K", runnerUp: "L" },
      { winner: "J", runnerUp: "I" },
      { winner: "L", runnerUp: "K" }
    ];
    const round16 = matchups.map((m, idx) => {
      const homeTeam = preds[m.winner]?.first || "?";
      const awayTeam = preds[m.runnerUp]?.second || "?";
      return {
        id: `round16_${idx}`,
        round: "round16",
        homeTeam,
        awayTeam,
        winner: null
      };
    });
    setBracket({
      round16,
      quarter: [],
      semi: [],
      final: null
    });
  };

  // Atualiza o vencedor de um jogo e propaga para as próximas fases
  const updateWinner = (matchId, winner, round) => {
    let newRound16 = [...bracket.round16];
    let newQuarter = [...bracket.quarter];
    let newSemi = [...bracket.semi];
    let newFinal = bracket.final;

    if (round === "round16") {
      newRound16 = newRound16.map(m => m.id === matchId ? { ...m, winner } : m);
      // Gerar quartas a partir dos vencedores das oitavas
      const winners = newRound16.filter(m => m.winner).map(m => m.winner);
      newQuarter = [];
      for (let i = 0; i < winners.length; i += 2) {
        newQuarter.push({
          id: `quarter_${i/2}`,
          round: "quarter",
          homeTeam: winners[i] || null,
          awayTeam: winners[i+1] || null,
          winner: null
        });
      }
    } else if (round === "quarter") {
      newQuarter = newQuarter.map(m => m.id === matchId ? { ...m, winner } : m);
      const winners = newQuarter.filter(m => m.winner).map(m => m.winner);
      newSemi = [];
      for (let i = 0; i < winners.length; i += 2) {
        newSemi.push({
          id: `semi_${i/2}`,
          round: "semi",
          homeTeam: winners[i] || null,
          awayTeam: winners[i+1] || null,
          winner: null
        });
      }
    } else if (round === "semi") {
      newSemi = newSemi.map(m => m.id === matchId ? { ...m, winner } : m);
      const winners = newSemi.filter(m => m.winner).map(m => m.winner);
      if (winners.length === 2) {
        newFinal = {
          id: "final",
          round: "final",
          homeTeam: winners[0],
          awayTeam: winners[1],
          winner: null
        };
      }
    } else if (round === "final") {
      newFinal = { ...newFinal, winner };
    }

    const updatedBracket = {
      round16: newRound16,
      quarter: newQuarter,
      semi: newSemi,
      final: newFinal
    };
    setBracket(updatedBracket);
    saveBracket(updatedBracket);
  };

  // Salva automaticamente no Firestore
  const saveBracket = async (bracketData) => {
    setSaving(true);
    try {
      await setDoc(doc(db, "knockoutPredictions", user.uid), bracketData);
    } catch (error) {
      console.error("Erro ao salvar bracket:", error);
    } finally {
      setSaving(false);
    }
  };

  // Renderiza uma fase como coluna
  const renderRound = (matches, roundName, roundKey) => {
    if (!matches.length && roundKey !== "final") return null;
    return (
      <div className="bracket-round">
        <h4>{roundName}</h4>
        {matches.map(match => (
          <div key={match.id} className="bracket-match">
            <div className="bracket-teams">
              <div className={`team ${match.winner === match.homeTeam ? "winner" : ""}`}>
                <Flag teamName={match.homeTeam} size={20} />
                <span>{match.homeTeam}</span>
              </div>
              <div className="vs">vs</div>
              <div className={`team ${match.winner === match.awayTeam ? "winner" : ""}`}>
                <Flag teamName={match.awayTeam} size={20} />
                <span>{match.awayTeam}</span>
              </div>
            </div>
            <select
              value={match.winner || ""}
              onChange={(e) => updateWinner(match.id, e.target.value, match.round)}
              disabled={!match.homeTeam || match.homeTeam === "?" || !match.awayTeam || match.awayTeam === "?"}
              className="winner-select"
            >
              <option value="">Selecione o vencedor</option>
              <option value={match.homeTeam}>{match.homeTeam}</option>
              <option value={match.awayTeam}>{match.awayTeam}</option>
            </select>
          </div>
        ))}
      </div>
    );
  };

  if (loading) return <div className="loading">Carregando chave do mata‑mata...</div>;

  return (
    <div className="knockout-bracket-container">
      <h2>🏆 Mata‑Mata – Palpites de quem avança</h2>
      {saving && <div className="saving-indicator">💾 Salvando automaticamente...</div>}
      <div className="bracket">
        {renderRound(bracket.round16, "Oitavas de final", "round16")}
        {renderRound(bracket.quarter, "Quartas de final", "quarter")}
        {renderRound(bracket.semi, "Semifinais", "semi")}
        {bracket.final && renderRound([bracket.final], "Final", "final")}
      </div>
    </div>
  );
}