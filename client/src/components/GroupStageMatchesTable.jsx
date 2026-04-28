import { useEffect, useMemo, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { Flag } from "../utils/countryCodes";
import { getTeamNamePortuguese } from "../utils/teamNames";

const formatDateTime = (startTime) => {
  if (!startTime) {
    return "A definir";
  }

  const date = new Date(startTime);
  if (Number.isNaN(date.getTime())) {
    return "Data invalida";
  }

  return `${date.toLocaleDateString("pt-BR")} • ${date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
};

const canSavePrediction = (match) => {
  if (!match?.startTime) {
    return false;
  }

  const matchDate = new Date(match.startTime);
  if (Number.isNaN(matchDate.getTime())) {
    return false;
  }

  return matchDate > new Date();
};

export default function GroupStageMatchesTable({ user, matchesFromSource }) {
  const [predictions, setPredictions] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [savingAll, setSavingAll] = useState(false);
  const [feedback, setFeedback] = useState("");

  const matches = useMemo(
    () =>
      (matchesFromSource || [])
        .filter((match) => match.round === "group")
        .sort((a, b) => new Date(a.startTime || 0) - new Date(b.startTime || 0)),
    [matchesFromSource],
  );

  useEffect(() => {
    const fetchPredictions = async () => {
      if (!user) {
        setPredictions({});
        setLoading(false);
        return;
      }

      const nextPredictions = {};
      for (const match of matches) {
        const predictionRef = doc(db, "predictions", `${user.uid}_${match.id}`);
        const predictionDoc = await getDoc(predictionRef);
        nextPredictions[match.id] = predictionDoc.exists()
          ? predictionDoc.data()
          : { homeScore: "", awayScore: "" };
      }

      setPredictions(nextPredictions);
      setLoading(false);
    };

    setLoading(true);
    fetchPredictions().catch((error) => {
      console.error("Erro ao carregar palpites:", error);
      setFeedback("Nao foi possivel carregar seus palpites.");
      setLoading(false);
    });
  }, [matches, user]);

  const persistPrediction = async (matchId) => {
    const prediction = predictions[matchId];
    const match = matches.find((item) => item.id === matchId);

    if (!match) {
      throw new Error("Jogo nao encontrado.");
    }

    if (!canSavePrediction(match)) {
      throw new Error("Esse jogo ja esta fechado para palpites.");
    }

    if (prediction.homeScore === "" || prediction.awayScore === "") {
      throw new Error("Preencha os dois placares.");
    }

    const homeScore = Number(prediction.homeScore);
    const awayScore = Number(prediction.awayScore);

    if (!Number.isInteger(homeScore) || !Number.isInteger(awayScore) || homeScore < 0 || awayScore < 0) {
      throw new Error("Use apenas gols inteiros maiores ou iguais a zero.");
    }

    await setDoc(doc(db, "predictions", `${user.uid}_${matchId}`), {
      userId: user.uid,
      matchId,
      homeScore,
      awayScore,
      updatedAt: new Date().toISOString(),
    });
  };

  const savePrediction = async (matchId) => {
    setFeedback("");
    setSaving((current) => ({ ...current, [matchId]: true }));

    try {
      await persistPrediction(matchId);
      setSaving((current) => ({ ...current, [matchId]: "saved" }));
      window.setTimeout(() => {
        setSaving((current) => ({ ...current, [matchId]: false }));
      }, 1200);
    } catch (error) {
      console.error("Erro ao salvar palpite:", error);
      setFeedback(error.message || "Erro ao salvar palpite.");
      setSaving((current) => ({ ...current, [matchId]: false }));
    }
  };

  const saveAllPredictions = async () => {
    const openMatches = matches.filter((match) => canSavePrediction(match));
    if (openMatches.length === 0) {
      setFeedback("Nao ha jogos abertos para salvar no momento.");
      return;
    }

    setSavingAll(true);
    setFeedback("");

    try {
      for (const match of openMatches) {
        const prediction = predictions[match.id];
        if (!prediction || prediction.homeScore === "" || prediction.awayScore === "") {
          continue;
        }

        await persistPrediction(match.id);
      }

      setFeedback("Palpites enviados com sucesso.");
    } catch (error) {
      console.error("Erro ao salvar palpites:", error);
      setFeedback(error.message || "Erro ao salvar palpites.");
    } finally {
      setSavingAll(false);
    }
  };

  if (loading) {
    return <div>Carregando palpites...</div>;
  }

  return (
    <div className="group-list-shell">
      <div className="group-list-toolbar">
        <span className="panel-pill">72 jogos</span>
        <button onClick={saveAllPredictions} disabled={savingAll} className="save-all-btn">
          {savingAll ? "Enviando..." : "Salvar palpites"}
        </button>
      </div>

      {feedback && <div className="inline-feedback">{feedback}</div>}

      <div className="group-match-list">
        {matches.map((match) => {
          const prediction = predictions[match.id] || { homeScore: "", awayScore: "" };
          const isOpen = canSavePrediction(match);

          return (
            <article key={match.id} className="group-match-card">
              <div className="group-match-topline">
                <span className="group-badge">Grupo {match.group}</span>
                <span>{formatDateTime(match.startTime)}</span>
              </div>

              <div className="group-match-teams">
                <div className="compact-team">
                  <Flag teamName={match.homeTeam} size={26} />
                  <strong>{getTeamNamePortuguese(match.homeTeam)}</strong>
                </div>
                <div className="compact-score-inputs">
                  <input
                    type="number"
                    min="0"
                    value={prediction.homeScore}
                    onChange={(event) =>
                      setPredictions((current) => ({
                        ...current,
                        [match.id]: {
                          ...prediction,
                          homeScore: event.target.value,
                        },
                      }))
                    }
                    disabled={!isOpen}
                  />
                  <span>x</span>
                  <input
                    type="number"
                    min="0"
                    value={prediction.awayScore}
                    onChange={(event) =>
                      setPredictions((current) => ({
                        ...current,
                        [match.id]: {
                          ...prediction,
                          awayScore: event.target.value,
                        },
                      }))
                    }
                    disabled={!isOpen}
                  />
                </div>
                <div className="compact-team compact-team--right">
                  <strong>{getTeamNamePortuguese(match.awayTeam)}</strong>
                  <Flag teamName={match.awayTeam} size={26} />
                </div>
              </div>

              <div className="group-match-actions">
                <span>{isOpen ? "Aberto para palpite" : "Jogo fechado"}</span>
                <button
                  onClick={() => savePrediction(match.id)}
                  disabled={!isOpen || Boolean(saving[match.id])}
                  className="save-row-btn"
                >
                  {saving[match.id] === "saved" ? "✅ Salvo" : saving[match.id] ? "..." : "Salvar"}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
