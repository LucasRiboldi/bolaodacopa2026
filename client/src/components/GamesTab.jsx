import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import GroupStageMatchesTable from "./GroupStageMatchesTable";

export default function GamesTab({ user }) {
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
          setMatches(
            snapshot.docs.map((item) => ({
              id: item.id,
              ...item.data(),
            })),
          );
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
          console.error("Erro ao carregar jogos:", error);
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
    <div className="content-stack">
      <div className="section-heading">
        <h3>⚽ Fase de grupos</h3>
        <p>Lista compacta com todas as partidas para palpitar rapido no celular.</p>
      </div>
      <GroupStageMatchesTable user={user} matchesFromSource={matches} />
    </div>
  );
}
