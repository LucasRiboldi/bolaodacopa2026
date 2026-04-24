// src/components/GroupStandings.jsx
import { useState, useEffect } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { groups } from "../utils/groupConfig";
import { Flag } from "../utils/countryCodes"; // <-- importe o componente Flag

export default function GroupStandings() {
  const [standings, setStandings] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "matches"), (snapshot) => {
      // ... lógica existente (igual)
      const finishedMatches = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.homeScore !== null && data.awayScore !== null) {
          finishedMatches.push({
            homeTeam: data.homeTeam,
            awayTeam: data.awayTeam,
            homeScore: data.homeScore,
            awayScore: data.awayScore,
          });
        }
      });

      const stats = {};
      for (const group in groups) {
        groups[group].forEach((team) => {
          stats[team] = {
            group,
            played: 0,
            wins: 0,
            draws: 0,
            losses: 0,
            goalsFor: 0,
            goalsAgainst: 0,
            points: 0,
          };
        });
      }

      finishedMatches.forEach((match) => {
        const { homeTeam, awayTeam, homeScore, awayScore } = match;
        if (stats[homeTeam] && stats[awayTeam]) {
          stats[homeTeam].played += 1;
          stats[awayTeam].played += 1;
          stats[homeTeam].goalsFor += homeScore;
          stats[homeTeam].goalsAgainst += awayScore;
          stats[awayTeam].goalsFor += awayScore;
          stats[awayTeam].goalsAgainst += homeScore;

          if (homeScore > awayScore) {
            stats[homeTeam].wins += 1;
            stats[awayTeam].losses += 1;
            stats[homeTeam].points += 3;
          } else if (awayScore > homeScore) {
            stats[awayTeam].wins += 1;
            stats[homeTeam].losses += 1;
            stats[awayTeam].points += 3;
          } else {
            stats[homeTeam].draws += 1;
            stats[awayTeam].draws += 1;
            stats[homeTeam].points += 1;
            stats[awayTeam].points += 1;
          }
        }
      });

      const groupedStandings = {};
      for (const team in stats) {
        const group = stats[team].group;
        if (!groupedStandings[group]) groupedStandings[group] = [];
        const teamStats = {
          ...stats[team],
          team,
          goalDifference: stats[team].goalsFor - stats[team].goalsAgainst,
        };
        groupedStandings[group].push(teamStats);
      }

      for (const group in groupedStandings) {
        groupedStandings[group].sort((a, b) => {
          if (a.points !== b.points) return b.points - a.points;
          if (a.goalDifference !== b.goalDifference) return b.goalDifference - a.goalDifference;
          return b.goalsFor - a.goalsFor;
        });
      }

      setStandings(groupedStandings);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) return <div className="group-loading">📡 Carregando classificação...</div>;

  return (
    <div className="group-standings">
      <h2>📊 Classificação dos Grupos</h2>
      <div className="groups-wrapper">
        {Object.keys(standings).map((group) => (
          <div key={group} className="group-card">
            <h3>Grupo {group}</h3>
            <div className="table-responsive">
              <table className="group-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Time</th>
                    <th>J</th>
                    <th>V</th>
                    <th>E</th>
                    <th>D</th>
                    <th>GP</th>
                    <th>GC</th>
                    <th>SG</th>
                    <th>P</th>
                  </tr>
                </thead>
                <tbody>
                  {standings[group].map((team, idx) => (
                    <tr key={team.team}>
                      <td className="position">{idx + 1}</td>
                      <td className="team-name-cell">
                        <div className="team-with-flag">
                          <Flag teamName={team.team} size={24} />
                          <span>{team.team}</span>
                        </div>
                      </td>
                      <td>{team.played}</td>
                      <td>{team.wins}</td>
                      <td>{team.draws}</td>
                      <td>{team.losses}</td>
                      <td>{team.goalsFor}</td>
                      <td>{team.goalsAgainst}</td>
                      <td className="gd">{team.goalDifference}</td>
                      <td className="points">{team.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}