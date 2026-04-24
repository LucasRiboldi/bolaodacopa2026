// src/components/BonusPredictions.jsx
import { useState, useEffect } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { allTeams } from "../utils/groupConfig";
import { Flag } from "../utils/countryCodes";

export default function BonusPredictions({ user }) {
  const [bonus, setBonus] = useState({
    semifinalists: [],
    finalists: [],
    champion: ""
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchBonus = async () => {
      if (!user) return;
      const docRef = doc(db, "bonusPredictions", user.uid);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        setBonus(snap.data());
      }
      setLoading(false);
    };
    fetchBonus();
  }, [user]);

  const updateSemifinalists = (team) => {
    let newList = [...bonus.semifinalists];
    if (newList.includes(team)) {
      newList = newList.filter(t => t !== team);
    } else if (newList.length < 4) {
      newList.push(team);
    } else {
      alert("Você só pode selecionar 4 semifinalistas.");
      return;
    }
    setBonus({ ...bonus, semifinalists: newList });
  };

  const updateFinalists = (team) => {
    let newList = [...bonus.finalists];
    if (newList.includes(team)) {
      newList = newList.filter(t => t !== team);
    } else if (newList.length < 2) {
      newList.push(team);
    } else {
      alert("Você só pode selecionar 2 finalistas.");
      return;
    }
    setBonus({ ...bonus, finalists: newList });
  };

  const saveBonus = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, "bonusPredictions", user.uid), bonus);
      alert("✅ Bônus salvos!");
    } catch (error) {
      console.error(error);
      alert("❌ Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Carregando...</div>;

  return (
    <div className="bonus-picker">
      <h3>🏆 Bônus (semifinalistas, finalistas e campeão)</h3>
      <div className="bonus-section">
        <label>Semifinalistas (4 times):</label>
        <div className="team-grid">
          {allTeams.map(team => (
            <button
              key={team}
              className={`team-badge ${bonus.semifinalists.includes(team) ? "selected" : ""}`}
              onClick={() => updateSemifinalists(team)}
            >
              <Flag teamName={team} size={20} />
              {team}
            </button>
          ))}
        </div>
      </div>
      <div className="bonus-section">
        <label>Finalistas (2 times):</label>
        <div className="team-grid">
          {allTeams.map(team => (
            <button
              key={team}
              className={`team-badge ${bonus.finalists.includes(team) ? "selected" : ""}`}
              onClick={() => updateFinalists(team)}
            >
              <Flag teamName={team} size={20} />
              {team}
            </button>
          ))}
        </div>
      </div>
      <div className="bonus-section">
        <label>Campeão:</label>
        <select value={bonus.champion} onChange={(e) => setBonus({...bonus, champion: e.target.value})}>
          <option value="">Selecione</option>
          {allTeams.map(team => <option key={team} value={team}>{team}</option>)}
        </select>
      </div>
      <button onClick={saveBonus} disabled={saving} className="save-bonus-btn">
        {saving ? "Salvando..." : "Salvar bônus"}
      </button>
    </div>
  );
}