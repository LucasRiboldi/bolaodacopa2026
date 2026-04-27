// src/components/LandingPage.jsx
import { useState } from "react";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "../firebase";
import Ranking from "./Ranking";
import EmailLogin from "./EmailLogin";

export default function LandingPage() {
  const [showEmailModal, setShowEmailModal] = useState(false);

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (error) {
      console.error(error);
      alert("Erro no login com Google.");
    }
  };

  return (
    <div className="landing-page">
      <div className="landing-hero">
        <div className="hero-badge">COPA DO MUNDO 2026</div>
        <h1 className="hero-title">
          APOSTE. PARTICIPE. <span>SEJA CAMPEÃO!</span>
        </h1>
        <p className="hero-subtitle">
          Mostre que você entende de futebol e conquiste o topo do ranking!
        </p>
        <div className="hero-buttons">
          <button className="btn-google" onClick={handleGoogleLogin}>
            🏆 Entrar com Google
          </button>
          <button className="btn-email" onClick={() => setShowEmailModal(true)}>
            📧 Entrar com e-mail
          </button>
        </div>
      </div>

      <div className="landing-ranking">
        <h2>📊 RANKING DE APOSTAS</h2>
        <Ranking limit={7} />
        <div style={{ textAlign: "center", marginTop: "1.5rem" }}>
          <p className="hero-note">
            FAÇA SUAS MELHORES APOSTAS E SUBA NO RANKING!<br />
            Cada palpite conta!
          </p>
        </div>
      </div>

      {showEmailModal && <EmailLogin onClose={() => setShowEmailModal(false)} />}
    </div>
  );
}