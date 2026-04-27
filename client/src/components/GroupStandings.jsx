// src/components/GroupStandings.jsx
import { useState, useEffect } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { groups } from "../utils/groupConfig";
import { Flag } from "../utils/countryCodes";
import { getTeamNamePortuguese } from "../utils/teamNames";



export default function GroupStandings() {
  const [standings, setStandings] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "matches"), (snapshot) => {
      const finishedMatches = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.homeScore !== null && data.awayScore !== null) {
          finishedMatches.push({
            homeTeam: data.homeTeam,
            awayTeam: data.awayTeam,
            homeScore: data.homeScore,
            awayScore: data.awayScore,
            round: data.round,
            group: data.group,
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
        if (match.round !== "group") return;
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
    <div className="group-standings-container">
      <h2>📊 TABELA DA COPA DO MUNDO 2026</h2>
      <div className="groups-standings-wrapper">
        {Object.keys(standings).map((group) => (
          <div key={group} className="group-standings-card">
            <h3 className="group-standings-title">GRUPO {group}</h3>
            <div className="table-responsive">
              <table className="group-standings-table">
                <thead>
                  <tr>
                    <th>POS</th>
                    <th>SELEÇÃO</th>
                    <th>J</th>
                    <th>V</th>
                    <th>E</th>
                    <th>D</th>
                    <th>GP</th>
                    <th>GC</th>
                    <th>SG</th>
                    <th>PTS</th>
                  </tr>
                </thead>
                <tbody>
                  {standings[group].map((team, idx) => (
                    <tr key={getTeamNamePortuguese(team.team)} className={idx < 2 ? "qualified" : ""}>
                      <td className="position">{idx + 1}</td>
                      <td className="team-name-cell">
                        <div className="team-with-flag">
                          <Flag teamName={getTeamNamePortuguese(team.team)} size={24} />
                          <span>{getTeamNamePortuguese(team.team)}</span>
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