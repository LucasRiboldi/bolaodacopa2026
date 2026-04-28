import { useEffect, useState } from "react";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { db, updateUserNickname } from "../firebase";
import GroupClassificationPicker from "./GroupClassificationPicker";
import BonusPredictions from "./BonusPredictions";
import { calculateUserScore } from "../utils/scoringEngine";

const EXACT_SCORE_POINTS = 6;
const CORRECT_RESULT_POINTS = 2;

export default function UserProfile({ user, userProfile, displayName, onProfileUpdate }) {
  const [activeTab, setActiveTab] = useState("history");
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nickname, setNickname] = useState(displayName || "");
  const [savingNickname, setSavingNickname] = useState(false);
  const [nicknameMessage, setNicknameMessage] = useState("");
  const [stats, setStats] = useState({
    totalPoints: 0,
    exactHits: 0,
    resultHits: 0,
    groupPoints: 0,
    totalBets: 0,
  });

  useEffect(() => {
    setNickname(displayName || "");
  }, [displayName]);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const [predictionsSnapshot, matchesSnapshot, rankingSnapshot, calculatedScore] = await Promise.all([
          getDocs(collection(db, "predictions")),
          getDocs(collection(db, "matches")),
          getDoc(doc(db, "rankings", user.uid)),
          calculateUserScore(user.uid),
        ]);

        const userPredictions = [];
        predictionsSnapshot.forEach((predictionDoc) => {
          const data = predictionDoc.data();
          if (data.userId === user.uid) {
            userPredictions.push({ id: predictionDoc.id, ...data });
          }
        });

        const matchesById = {};
        matchesSnapshot.forEach((matchDoc) => {
          matchesById[matchDoc.id] = matchDoc.data();
        });

        const detailedPredictions = userPredictions
          .map((prediction) => {
            const match = matchesById[prediction.matchId];
            if (!match || match.homeScore === null || match.awayScore === null) {
              return {
                ...prediction,
                matchName: `${match?.homeTeam || "?"} x ${match?.awayTeam || "?"}`,
                realScore: null,
                points: null,
                status: "Aguardando resultado",
              };
            }

            const isExact = prediction.homeScore === match.homeScore && prediction.awayScore === match.awayScore;
            const sameResult =
              (prediction.homeScore > prediction.awayScore && match.homeScore > match.awayScore) ||
              (prediction.homeScore < prediction.awayScore && match.homeScore < match.awayScore) ||
              (prediction.homeScore === prediction.awayScore && match.homeScore === match.awayScore);
            const points = isExact ? EXACT_SCORE_POINTS : sameResult ? CORRECT_RESULT_POINTS : 0;

            return {
              ...prediction,
              matchName: `${match.homeTeam} x ${match.awayTeam}`,
              realScore: `${match.homeScore} - ${match.awayScore}`,
              points,
              status: isExact ? "Placar exato" : sameResult ? "Resultado correto" : "Errou",
            };
          })
          .sort((first, second) => {
            const firstDate = matchesById[first.matchId]?.startTime || "";
            const secondDate = matchesById[second.matchId]?.startTime || "";
            return new Date(secondDate) - new Date(firstDate);
          });

        const rankingData = rankingSnapshot.exists()
          ? rankingSnapshot.data()
          : { totalPoints: calculatedScore.total, details: calculatedScore.details };

        setPredictions(detailedPredictions);
        setStats({
          totalPoints: rankingData.totalPoints || 0,
          exactHits: rankingData.details?.exact || 0,
          resultHits: rankingData.details?.result || 0,
          groupPoints: rankingData.details?.group || 0,
          totalBets: userPredictions.length,
        });
      } catch (error) {
        console.error("Erro ao carregar perfil:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user]);

  const handleNicknameSave = async () => {
    if (!nickname.trim()) {
      setNicknameMessage("Digite um apelido valido.");
      return;
    }

    setSavingNickname(true);
    setNicknameMessage("");

    try {
      const updatedDisplayName = await updateUserNickname(user, nickname);
      if (onProfileUpdate) {
        onProfileUpdate({
          ...userProfile,
          displayName: updatedDisplayName,
        });
      }
      setNickname(updatedDisplayName);
      setNicknameMessage("Apelido atualizado.");
    } catch (error) {
      console.error("Erro ao atualizar apelido:", error);
      setNicknameMessage("Nao foi possivel salvar o apelido.");
    } finally {
      setSavingNickname(false);
      window.setTimeout(() => setNicknameMessage(""), 2500);
    }
  };

  if (loading) {
    return <div className="profile-loading">Carregando seu perfil...</div>;
  }

  return (
    <div className="user-profile">
      <section className="profile-card">
        <div className="profile-header">
          <img
            src={user.photoURL || userProfile?.photoURL || "/default-avatar.png"}
            alt={displayName}
            className="profile-avatar"
          />
          <div className="profile-header-copy">
            <span className="panel-kicker">Perfil do apostador</span>
            <h2>{displayName}</h2>
            <p>{user.email}</p>
          </div>
        </div>

        <div className="nickname-editor">
          <label className="input-group">
            <span>Apelido publico</span>
            <input value={nickname} onChange={(event) => setNickname(event.target.value)} maxLength={32} />
          </label>
          <button className="auth-submit-button" onClick={handleNicknameSave} disabled={savingNickname}>
            {savingNickname ? "Salvando..." : "Salvar apelido"}
          </button>
        </div>
        {nicknameMessage && <div className="inline-feedback">{nicknameMessage}</div>}
      </section>

      <div className="stats-cards">
        <div className="stat-card">
          <span className="stat-value">{stats.totalPoints}</span>
          <span className="stat-label">Pontos totais</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.exactHits}</span>
          <span className="stat-label">Placares exatos</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.resultHits}</span>
          <span className="stat-label">Resultados certos</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.groupPoints}</span>
          <span className="stat-label">Pontos em grupos</span>
        </div>
      </div>

      <div className="profile-tabs">
        <button className={activeTab === "history" ? "active" : ""} onClick={() => setActiveTab("history")}>
          Palpites
        </button>
        <button className={activeTab === "advanced" ? "active" : ""} onClick={() => setActiveTab("advanced")}>
          Classificacao e bonus
        </button>
      </div>

      {activeTab === "history" && (
        <div className="predictions-history">
          {predictions.length === 0 && <p>Voce ainda nao fez nenhum palpite.</p>}
          {predictions.map((prediction) => (
            <div key={prediction.id} className="history-item">
              <div className="history-match">{prediction.matchName}</div>
              <div className="history-scores">
                <span>Seu palpite: {prediction.homeScore} - {prediction.awayScore}</span>
                {prediction.realScore && <span>Resultado real: {prediction.realScore}</span>}
              </div>
              <div
                className={`history-points ${
                  prediction.points === EXACT_SCORE_POINTS
                    ? "exact"
                    : prediction.points === CORRECT_RESULT_POINTS
                      ? "result"
                      : "wrong"
                }`}
              >
                {prediction.status}
                {prediction.points !== null && ` (+${prediction.points} pts)`}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "advanced" && (
        <div className="advanced-predictions">
          <GroupClassificationPicker user={user} />
          <hr className="separator" />
          <div className="future-feature-notice">
            <p>A fase de mata-mata ainda nao esta ativa. Por enquanto voce pode salvar grupos e bonus.</p>
          </div>
          <hr className="separator" />
          <BonusPredictions user={user} />
        </div>
      )}
    </div>
  );
}
