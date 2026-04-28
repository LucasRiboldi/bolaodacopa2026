import { useEffect, useState } from "react";
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

  return `${date.toLocaleDateString("pt-BR")} ${date.toLocaleTimeString("pt-BR", {
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

export default function GroupStageMatchesTable({ user, selectedGroup, matchesFromSource }) {
  const [matches, setMatches] = useState([]);
  const [predictions, setPredictions] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [savingAll, setSavingAll] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const filteredMatches = (matchesFromSource || [])
      .filter((match) => match.round === "group" && match.group === selectedGroup)
      .sort((a, b) => new Date(a.startTime || 0) - new Date(b.startTime || 0));

    setMatches(filteredMatches);

    const fetchPredictions = async () => {
      if (!user) {
        setPredictions({});
        setLoading(false);
        return;
      }

      const nextPredictions = {};
      for (const match of filteredMatches) {
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
      setErrorMessage("Nao foi possivel carregar seus palpites.");
      setLoading(false);
    });
  }, [matchesFromSource, selectedGroup, user]);

  const persistPrediction = async (matchId) => {
    const prediction = predictions[matchId];
    const match = matches.find((item) => item.id === matchId);

    if (!match) {
      throw new Error("Jogo nao encontrado.");
    }

    if (!canSavePrediction(match)) {
      throw new Error("Este jogo nao aceita mais palpites.");
    }

    if (prediction.homeScore === "" || prediction.awayScore === "") {
      throw new Error("Preencha ambos os placares antes de salvar.");
    }

    const homeScore = Number(prediction.homeScore);
    const awayScore = Number(prediction.awayScore);

    if (!Number.isInteger(homeScore) || !Number.isInteger(awayScore) || homeScore < 0 || awayScore < 0) {
      throw new Error("Os placares precisam ser inteiros maiores ou iguais a zero.");
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
    setErrorMessage("");
    setSaving((previous) => ({ ...previous, [matchId]: true }));

    try {
      await persistPrediction(matchId);
      setSaving((previous) => ({ ...previous, [matchId]: "saved" }));
      window.setTimeout(() => {
        setSaving((previous) => ({ ...previous, [matchId]: false }));
      }, 1000);
    } catch (error) {
      console.error("Erro ao salvar palpite:", error);
      setErrorMessage(error.message || "Erro ao salvar palpite.");
      setSaving((previous) => ({ ...previous, [matchId]: false }));
    }
  };

  const saveAllPredictions = async () => {
    const validMatches = matches.filter((match) => canSavePrediction(match));
    if (validMatches.length === 0) {
      setErrorMessage("Nao ha jogos desbloqueados para salvar neste grupo.");
      return;
    }

    setErrorMessage("");
    setSavingAll(true);

    try {
      for (const match of validMatches) {
        const prediction = predictions[match.id];
        if (!prediction || prediction.homeScore === "" || prediction.awayScore === "") {
          continue;
        }

        await persistPrediction(match.id);
      }
    } catch (error) {
      console.error("Erro ao salvar palpites do grupo:", error);
      setErrorMessage(error.message || "Erro ao salvar palpites.");
    } finally {
      setSavingAll(false);
    }
  };

  if (loading) {
    return <div>Carregando palpites...</div>;
  }

  return (
    <div className="matches-table-container">
      <div className="table-header-actions">
        <h2>Grupo {selectedGroup}</h2>
        <button onClick={saveAllPredictions} disabled={savingAll} className="save-all-btn">
          {savingAll ? "Salvando..." : "Salvar todos"}
        </button>
      </div>

      {errorMessage && <div className="admin-message">{errorMessage}</div>}

      <table className="matches-planilha">
        <thead>
          <tr>
            <th>Data/Hora</th>
            <th>Mandante</th>
            <th>Gols</th>
            <th></th>
            <th>Gols</th>
            <th>Visitante</th>
            <th>Acoes</th>
          </tr>
        </thead>
        <tbody>
          {matches.map((match) => {
            const prediction = predictions[match.id] || { homeScore: "", awayScore: "" };
            const isOpen = canSavePrediction(match);

            return (
              <tr key={match.id}>
                <td>{formatDateTime(match.startTime)}</td>
                <td className="team-cell">
                  <Flag teamName={match.homeTeam} size={24} />
                  {getTeamNamePortuguese(match.homeTeam)}
                </td>
                <td>
                  <input
                    type="number"
                    min="0"
                    value={prediction.homeScore}
                    onChange={(event) =>
                      setPredictions((previous) => ({
                        ...previous,
                        [match.id]: {
                          ...prediction,
                          homeScore: event.target.value,
                        },
                      }))
                    }
                    disabled={!isOpen}
                  />
                </td>
                <td>X</td>
                <td>
                  <input
                    type="number"
                    min="0"
                    value={prediction.awayScore}
                    onChange={(event) =>
                      setPredictions((previous) => ({
                        ...previous,
                        [match.id]: {
                          ...prediction,
                          awayScore: event.target.value,
                        },
                      }))
                    }
                    disabled={!isOpen}
                  />
                </td>
                <td className="team-cell">
                  <Flag teamName={match.awayTeam} size={24} />
                  {getTeamNamePortuguese(match.awayTeam)}
                </td>
                <td>
                  {isOpen ? (
                    <button
                      onClick={() => savePrediction(match.id)}
                      disabled={Boolean(saving[match.id])}
                      className="save-row-btn"
                    >
                      {saving[match.id] === "saved" ? "OK" : saving[match.id] ? "..." : "Salvar"}
                    </button>
                  ) : (
                    <span>Fechado</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
