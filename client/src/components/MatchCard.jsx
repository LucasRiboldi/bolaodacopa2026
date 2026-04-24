
import { Flag } from "../utils/countryCodes";

export default function MatchCard({ match, prediction, onSave, isStarted, saving }) {
  const homePred = prediction?.homeScore ?? "";
  const awayPred = prediction?.awayScore ?? "";

  const handleHomeChange = (e) => {
    const newVal = e.target.value;
    onSave(match.id, { homeScore: newVal, awayScore: awayPred });
  };

  const handleAwayChange = (e) => {
    const newVal = e.target.value;
    onSave(match.id, { homeScore: homePred, awayScore: newVal });
  };

  const handleSave = () => {
    onSave(match.id, { homeScore: homePred, awayScore: awayPred }, true);
  };

  return (
    <div className="match-card">
      <div className="match-header">
        <span className="match-date">{new Date(match.startTime).toLocaleString()}</span>
        <span className="match-stadium">{match.stadium || "Estádio"}</span>
      </div>

      <div className="match-teams">
        <div className="team home">
          <Flag teamName={match.homeTeam} size={48} />
          <span className="team-name">{match.homeTeam}</span>
        </div>
        <div className="vs">VS</div>
        <div className="team away">
          <Flag teamName={match.awayTeam} size={48} />
          <span className="team-name">{match.awayTeam}</span>
        </div>
      </div>

      {match.homeScore !== null && match.awayScore !== null && (
        <div className="real-result">
          Resultado real: <strong>{match.homeScore} - {match.awayScore}</strong>
        </div>
      )}

      <div className="prediction-area">
        <label>Seu palpite:</label>
        <div className="score-inputs">
          <input
            type="number"
            min="0"
            value={homePred}
            onChange={handleHomeChange}
            disabled={isStarted}
            placeholder="0"
          />
          <span>x</span>
          <input
            type="number"
            min="0"
            value={awayPred}
            onChange={handleAwayChange}
            disabled={isStarted}
            placeholder="0"
          />
        </div>
        <button
          onClick={handleSave}
          disabled={isStarted || saving || homePred === "" || awayPred === ""}
          className="save-btn"
        >
          {saving ? "Salvando..." : "Salvar palpite"}
        </button>
        {isStarted && <span className="blocked-message">⏰ Jogo já começou</span>}
      </div>
    </div>
  );
}