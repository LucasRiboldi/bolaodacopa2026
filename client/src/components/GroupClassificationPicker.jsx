// src/components/GroupClassificationPicker.jsx
import { useState, useEffect } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { groups } from "../utils/groupConfig";
import { Flag } from "../utils/countryCodes";

export default function GroupClassificationPicker({ user }) {
  const [predictions, setPredictions] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchPredictions = async () => {
      if (!user) return;
      const saved = {};
      for (const group of Object.keys(groups)) {
        const docRef = doc(db, "groupPredictions", `${user.uid}_${group}`);
        const snap = await getDoc(docRef);
        saved[group] = snap.exists() ? snap.data() : { first: "", second: "" };
      }
      setPredictions(saved);
      setLoading(false);
    };
    fetchPredictions();
  }, [user]);

  const updateGroup = (group, position, team) => {
    setPredictions(prev => ({
      ...prev,
      [group]: { ...prev[group], [position]: team }
    }));
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      for (const group of Object.keys(predictions)) {
        const data = predictions[group];
        if (data.first && data.second && data.first !== data.second) {
          await setDoc(doc(db, "groupPredictions", `${user.uid}_${group}`), data);
        }
      }
      alert("✅ Palpites de grupos salvos!");
    } catch (error) {
      console.error(error);
      alert("❌ Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Carregando...</div>;

  return (
    <div className="group-picker">
      <h3>🏆 Classificação dos Grupos (1º e 2º lugares)</h3>
      {Object.entries(groups).map(([group, teams]) => (
        <div key={group} className="group-pick-card">
          <h4>Grupo {group}</h4>
          <div className="group-selects">
            <div className="position">
              <strong>1º lugar</strong>
              <select value={predictions[group]?.first || ""} onChange={(e) => updateGroup(group, "first", e.target.value)}>
                <option value="">Selecione</option>
                {teams.map(team => <option key={team} value={team}>{team}</option>)}
              </select>
            </div>
            <div className="position">
              <strong>2º lugar</strong>
              <select value={predictions[group]?.second || ""} onChange={(e) => updateGroup(group, "second", e.target.value)}>
                <option value="">Selecione</option>
                {teams.map(team => <option key={team} value={team}>{team}</option>)}
              </select>
            </div>
          </div>
        </div>
      ))}
      <button onClick={saveAll} disabled={saving} className="save-group-btn">{saving ? "Salvando..." : "Salvar todos os grupos"}</button>
    </div>
  );
}