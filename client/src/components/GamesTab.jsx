import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import GroupStageMatchesTable from "./GroupStageMatchesTable";

export default function GamesTab({ user }) {
  const [selectedGroup, setSelectedGroup] = useState("A");
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const unsubscribe = onSnapshot(
      collection(db, "matches"),
      async (snapshot) => {
        if (!isMounted) {
          return;
        }

        if (!snapshot.empty) {
          const firestoreMatches = snapshot.docs.map((item) => ({
            id: item.id,
            ...item.data(),
          }));
          setMatches(firestoreMatches);
          setLoading(false);
          return;
        }

        try {
          const response = await fetch("/matches-data.json");
          const fallbackMatches = await response.json();
          if (isMounted) {
            setMatches(fallbackMatches);
          }
        } catch (error) {
          console.error("Erro ao carregar fallback de jogos:", error);
          if (isMounted) {
            setMatches([]);
          }
        } finally {
          if (isMounted) {
            setLoading(false);
          }
        }
      },
      (error) => {
        console.error("Erro ao observar jogos:", error);
        if (isMounted) {
          setLoading(false);
        }
      },
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  if (loading) {
    return <div>Carregando jogos...</div>;
  }

  return (
    <div>
      <div className="games-header">
        <h2>FASE DE GRUPOS</h2>
      </div>
      <div className="groups-filter">
        {["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"].map((group) => (
          <button
            key={group}
            className={`group-filter-btn ${selectedGroup === group ? "active" : ""}`}
            onClick={() => setSelectedGroup(group)}
          >
            Grupo {group}
          </button>
        ))}
      </div>
      <GroupStageMatchesTable
        user={user}
        selectedGroup={selectedGroup}
        matchesFromSource={matches}
      />
    </div>
  );
}
