import { useEffect, useMemo, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { Flag } from "../utils/countryCodes";
import { groups } from "../utils/groupConfig";
import { getTeamNamePortuguese } from "../utils/teamNames";

const ROUND32_MATCHES = [
  { id: 73, label: "M73", home: { type: "group", group: "A", position: "second" }, away: { type: "group", group: "B", position: "second" } },
  { id: 74, label: "M74", home: { type: "group", group: "E", position: "first" }, away: { type: "third", slotId: "tp74", groups: ["A", "B", "C", "D", "F"] } },
  { id: 75, label: "M75", home: { type: "group", group: "F", position: "first" }, away: { type: "group", group: "C", position: "second" } },
  { id: 76, label: "M76", home: { type: "group", group: "C", position: "first" }, away: { type: "group", group: "F", position: "second" } },
  { id: 77, label: "M77", home: { type: "group", group: "I", position: "first" }, away: { type: "third", slotId: "tp77", groups: ["C", "D", "F", "G", "H"] } },
  { id: 78, label: "M78", home: { type: "group", group: "E", position: "second" }, away: { type: "group", group: "I", position: "second" } },
  { id: 79, label: "M79", home: { type: "group", group: "A", position: "first" }, away: { type: "third", slotId: "tp79", groups: ["C", "E", "F", "H", "I"] } },
  { id: 80, label: "M80", home: { type: "group", group: "L", position: "first" }, away: { type: "third", slotId: "tp80", groups: ["E", "H", "I", "J", "K"] } },
  { id: 81, label: "M81", home: { type: "group", group: "D", position: "first" }, away: { type: "third", slotId: "tp81", groups: ["B", "E", "F", "I", "J"] } },
  { id: 82, label: "M82", home: { type: "group", group: "G", position: "first" }, away: { type: "third", slotId: "tp82", groups: ["A", "E", "H", "I", "J"] } },
  { id: 83, label: "M83", home: { type: "group", group: "K", position: "second" }, away: { type: "group", group: "L", position: "second" } },
  { id: 84, label: "M84", home: { type: "group", group: "H", position: "first" }, away: { type: "group", group: "J", position: "second" } },
  { id: 85, label: "M85", home: { type: "group", group: "B", position: "first" }, away: { type: "third", slotId: "tp85", groups: ["E", "F", "G", "I", "J"] } },
  { id: 86, label: "M86", home: { type: "group", group: "J", position: "first" }, away: { type: "group", group: "H", position: "second" } },
  { id: 87, label: "M87", home: { type: "group", group: "K", position: "first" }, away: { type: "third", slotId: "tp87", groups: ["D", "E", "I", "J", "L"] } },
  { id: 88, label: "M88", home: { type: "group", group: "D", position: "second" }, away: { type: "group", group: "G", position: "second" } },
];

const KNOCKOUT_ROUNDS = [
  { title: "Oitavas - caminho 1", matches: [{ id: 89, sourceMatches: [74, 77] }, { id: 90, sourceMatches: [73, 75] }, { id: 91, sourceMatches: [76, 78] }, { id: 92, sourceMatches: [79, 80] }] },
  { title: "Oitavas - caminho 2", matches: [{ id: 93, sourceMatches: [83, 84] }, { id: 94, sourceMatches: [81, 82] }, { id: 95, sourceMatches: [86, 88] }, { id: 96, sourceMatches: [85, 87] }] },
  { title: "Quartas", matches: [{ id: 97, sourceMatches: [89, 90] }, { id: 98, sourceMatches: [93, 94] }, { id: 99, sourceMatches: [91, 92] }, { id: 100, sourceMatches: [95, 96] }] },
  { title: "Semifinais", matches: [{ id: 101, sourceMatches: [97, 98] }, { id: 102, sourceMatches: [99, 100] }] },
  { title: "Decisao", matches: [{ id: 103, sourceMatches: [101, 102], mode: "losers" }, { id: 104, sourceMatches: [101, 102], mode: "winners" }] },
];

const createDefaultGroupSelections = () =>
  Object.fromEntries(Object.keys(groups).map((group) => [group, { first: "", second: "" }]));

const createDefaultThirdPlaceAssignments = () =>
  Object.fromEntries(
    ROUND32_MATCHES.flatMap((match) =>
      [match.home, match.away]
        .filter((slot) => slot.type === "third")
        .map((slot) => [slot.slotId, ""]),
    ),
  );

const createDefaultWinners = () =>
  Object.fromEntries([...ROUND32_MATCHES.map((match) => match.id), ...KNOCKOUT_ROUNDS.flatMap((round) => round.matches.map((match) => match.id))].map((id) => [id, ""]));

const getTeamListForThirdPlace = (eligibleGroups, groupSelections) =>
  eligibleGroups.flatMap((group) =>
    groups[group].filter(
      (team) =>
        team !== groupSelections[group]?.first &&
        team !== groupSelections[group]?.second,
    ),
  );

const uniqueTeams = (teams) => [...new Set(teams.filter(Boolean))];

export default function KnockoutBracket({ user }) {
  const [groupSelections, setGroupSelections] = useState(createDefaultGroupSelections);
  const [thirdPlaceAssignments, setThirdPlaceAssignments] = useState(createDefaultThirdPlaceAssignments);
  const [winners, setWinners] = useState(createDefaultWinners);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const loadPredictions = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const nextGroups = createDefaultGroupSelections();
        for (const group of Object.keys(groups)) {
          const predictionDoc = await getDoc(doc(db, "groupPredictions", `${user.uid}_${group}`));
          if (predictionDoc.exists()) {
            nextGroups[group] = {
              first: predictionDoc.data().first || "",
              second: predictionDoc.data().second || "",
            };
          }
        }

        const knockoutDoc = await getDoc(doc(db, "knockoutPredictions", user.uid));
        if (knockoutDoc.exists()) {
          const data = knockoutDoc.data();
          setThirdPlaceAssignments({ ...createDefaultThirdPlaceAssignments(), ...(data.thirdPlaceAssignments || {}) });
          setWinners({ ...createDefaultWinners(), ...(data.winners || {}) });
        }

        setGroupSelections(nextGroups);
      } catch (error) {
        console.error("Erro ao carregar mata-mata:", error);
        setMessage("Nao foi possivel carregar o mata-mata.");
      } finally {
        setLoading(false);
      }
    };

    loadPredictions();
  }, [user]);

  const assignedThirdPlaceTeams = useMemo(
    () => Object.values(thirdPlaceAssignments).filter(Boolean),
    [thirdPlaceAssignments],
  );

  const resolveSlotTeam = (slot) => {
    if (slot.type === "group") {
      return groupSelections[slot.group]?.[slot.position] || "";
    }

    return thirdPlaceAssignments[slot.slotId] || "";
  };

  const getSlotOptions = (slot) => {
    if (slot.type === "group") {
      return uniqueTeams([groupSelections[slot.group]?.[slot.position]]);
    }

    return uniqueTeams(
      getTeamListForThirdPlace(slot.groups, groupSelections).filter(
        (team) => !assignedThirdPlaceTeams.includes(team) || thirdPlaceAssignments[slot.slotId] === team,
      ),
    );
  };

  const getWinnerOptions = (match) => uniqueTeams([resolveSlotTeam(match.home), resolveSlotTeam(match.away)]);

  const getRoundOptions = (match) => {
    const sourceOptions = match.sourceMatches.map((id) => winners[id]).filter(Boolean);
    return uniqueTeams(sourceOptions);
  };

  const getBronzeOptions = (match) => {
    if (match.mode !== "losers") {
      return [];
    }

    return uniqueTeams(
      match.sourceMatches.flatMap((sourceMatchId) => {
        const sourceMatch = KNOCKOUT_ROUNDS.flatMap((round) => round.matches).find((item) => item.id === sourceMatchId);
        if (!sourceMatch) {
          return [];
        }
        const options = getRoundOptions(sourceMatch);
        return options.filter((team) => team && team !== winners[sourceMatchId]);
      }),
    );
  };

  const saveBracket = async () => {
    setSaving(true);
    setMessage("");

    try {
      for (const [group, prediction] of Object.entries(groupSelections)) {
        if (prediction.first && prediction.second && prediction.first !== prediction.second) {
          await setDoc(doc(db, "groupPredictions", `${user.uid}_${group}`), prediction, { merge: true });
        }
      }

      await setDoc(
        doc(db, "knockoutPredictions", user.uid),
        {
          userId: user.uid,
          thirdPlaceAssignments,
          winners,
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );

      setMessage("Palpites do mata-mata salvos.");
    } catch (error) {
      console.error("Erro ao salvar mata-mata:", error);
      setMessage("Nao foi possivel salvar o mata-mata.");
    } finally {
      setSaving(false);
      window.setTimeout(() => setMessage(""), 2600);
    }
  };

  if (loading) {
    return <div>Carregando mata-mata...</div>;
  }

  return (
    <div className="content-stack">
      <div className="section-heading">
        <h3>🏆 Mata-mata</h3>
        <p>Estrutura baseada no cronograma oficial da FIFA 2026, com avancos permitidos apenas pelos caminhos validos.</p>
      </div>

      <section className="knockout-qualifiers">
        <div className="ranking-panel-header">
          <div>
            <span className="panel-kicker">Classificados</span>
            <h2>1º e 2º de cada grupo</h2>
          </div>
          <span className="panel-pill">FIFA 2026</span>
        </div>

        <div className="knockout-group-grid">
          {Object.entries(groups).map(([group, teams]) => (
            <article key={group} className="knockout-group-card">
              <h4>Grupo {group}</h4>
              <label className="input-group">
                <span>1º lugar</span>
                <select
                  value={groupSelections[group]?.first || ""}
                  onChange={(event) =>
                    setGroupSelections((current) => ({
                      ...current,
                      [group]: { ...current[group], first: event.target.value },
                    }))
                  }
                >
                  <option value="">Selecione</option>
                  {teams.map((team) => (
                    <option key={`${group}-first-${team}`} value={team}>
                      {getTeamNamePortuguese(team)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="input-group">
                <span>2º lugar</span>
                <select
                  value={groupSelections[group]?.second || ""}
                  onChange={(event) =>
                    setGroupSelections((current) => ({
                      ...current,
                      [group]: { ...current[group], second: event.target.value },
                    }))
                  }
                >
                  <option value="">Selecione</option>
                  {teams.map((team) => (
                    <option key={`${group}-second-${team}`} value={team}>
                      {getTeamNamePortuguese(team)}
                    </option>
                  ))}
                </select>
              </label>
            </article>
          ))}
        </div>
      </section>

      <section className="knockout-bracket-board">
        <div className="ranking-panel-header">
          <div>
            <span className="panel-kicker">Bracket oficial</span>
            <h2>Chave da Copa 2026</h2>
          </div>
          <button className="save-all-btn" onClick={saveBracket} disabled={saving}>
            {saving ? "Salvando..." : "Salvar mata-mata"}
          </button>
        </div>

        {message && <div className="inline-feedback">{message}</div>}

        <div className="knockout-round-stack">
          <div className="knockout-round">
            <h4>Round of 32</h4>
            <div className="knockout-match-grid">
              {ROUND32_MATCHES.map((match) => {
                const homeTeam = resolveSlotTeam(match.home);
                const awayTeam = resolveSlotTeam(match.away);
                const winnerOptions = getWinnerOptions(match);

                return (
                  <article key={match.id} className="knockout-match-card">
                    <div className="knockout-match-header">
                      <strong>{match.label}</strong>
                      <span>R32</span>
                    </div>

                    {match.home.type === "third" ? (
                      <label className="input-group">
                        <span>Melhor 3º lado A</span>
                        <select
                          value={thirdPlaceAssignments[match.home.slotId] || ""}
                          onChange={(event) =>
                            setThirdPlaceAssignments((current) => ({
                              ...current,
                              [match.home.slotId]: event.target.value,
                            }))
                          }
                        >
                          <option value="">Selecione</option>
                          {getSlotOptions(match.home).map((team) => (
                            <option key={`${match.home.slotId}-${team}`} value={team}>
                              {getTeamNamePortuguese(team)}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : (
                      <div className="knockout-team-chip">
                        <Flag teamName={homeTeam} size={22} />
                        <span>{homeTeam ? getTeamNamePortuguese(homeTeam) : "Aguardando grupo"}</span>
                      </div>
                    )}

                    {match.away.type === "third" ? (
                      <label className="input-group">
                        <span>Melhor 3º lado B</span>
                        <select
                          value={thirdPlaceAssignments[match.away.slotId] || ""}
                          onChange={(event) =>
                            setThirdPlaceAssignments((current) => ({
                              ...current,
                              [match.away.slotId]: event.target.value,
                            }))
                          }
                        >
                          <option value="">Selecione</option>
                          {getSlotOptions(match.away).map((team) => (
                            <option key={`${match.away.slotId}-${team}`} value={team}>
                              {getTeamNamePortuguese(team)}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : (
                      <div className="knockout-team-chip">
                        <Flag teamName={awayTeam} size={22} />
                        <span>{awayTeam ? getTeamNamePortuguese(awayTeam) : "Aguardando grupo"}</span>
                      </div>
                    )}

                    <label className="input-group">
                      <span>Quem avanca</span>
                      <select
                        value={winners[match.id] || ""}
                        onChange={(event) =>
                          setWinners((current) => ({
                            ...current,
                            [match.id]: event.target.value,
                          }))
                        }
                      >
                        <option value="">Selecione</option>
                        {winnerOptions.map((team) => (
                          <option key={`${match.id}-${team}`} value={team}>
                            {getTeamNamePortuguese(team)}
                          </option>
                        ))}
                      </select>
                    </label>
                  </article>
                );
              })}
            </div>
          </div>

          {KNOCKOUT_ROUNDS.map((round) => (
            <div key={round.title} className="knockout-round">
              <h4>{round.title}</h4>
              <div className="knockout-match-grid">
                {round.matches.map((match) => {
                  const options = match.mode === "losers" ? getBronzeOptions(match) : getRoundOptions(match);

                  return (
                    <article key={match.id} className="knockout-match-card">
                      <div className="knockout-match-header">
                        <strong>M{match.id}</strong>
                        <span>{round.title}</span>
                      </div>
                      <div className="knockout-source-list">
                        {match.sourceMatches.map((sourceMatchId) => (
                          <span key={`${match.id}-src-${sourceMatchId}`}>origem M{sourceMatchId}</span>
                        ))}
                      </div>
                      <label className="input-group">
                        <span>{match.id === 103 ? "3º lugar" : match.id === 104 ? "Campeao" : "Quem avanca"}</span>
                        <select
                          value={winners[match.id] || ""}
                          onChange={(event) =>
                            setWinners((current) => ({
                              ...current,
                              [match.id]: event.target.value,
                            }))
                          }
                        >
                          <option value="">Selecione</option>
                          {options.map((team) => (
                            <option key={`${match.id}-${team}`} value={team}>
                              {getTeamNamePortuguese(team)}
                            </option>
                          ))}
                        </select>
                      </label>
                    </article>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
