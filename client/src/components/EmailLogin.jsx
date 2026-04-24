// src/components/EmailLogin.jsx
import { useState } from "react";
import { loginWithEmail, registerWithEmail } from "../firebase";

export default function EmailLogin({ onClose }) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (isRegister && password !== confirmPassword) {
      setError("As senhas não coincidem");
      return;
    }
    setLoading(true);
    try {
      if (isRegister) {
        await registerWithEmail(email, password, displayName);
      } else {
        await loginWithEmail(email, password);
      }
      onClose(); // Fecha o modal após login bem‑sucedido
    } catch (err) {
      console.error(err);
      switch (err.code) {
        case "auth/user-not-found":
          setError("Usuário não encontrado");
          break;
        case "auth/wrong-password":
          setError("Senha incorreta");
          break;
        case "auth/email-already-in-use":
          setError("E-mail já cadastrado");
          break;
        case "auth/weak-password":
          setError("Senha muito fraca (mínimo 6 caracteres)");
          break;
        default:
          setError("Erro ao fazer login. Tente novamente.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="email-login-modal">
      <div className="email-login-card">
        <button className="close-btn" onClick={onClose}>✕</button>
        <h2>{isRegister ? "Criar conta" : "Entrar com e-mail"}</h2>
        <form onSubmit={handleSubmit}>
          {isRegister && (
            <input
              type="text"
              placeholder="Nome (opcional)"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          )}
          <input
            type="email"
            placeholder="Seu e-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {isRegister && (
            <input
              type="password"
              placeholder="Confirmar senha"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          )}
          {error && <div className="error-msg">{error}</div>}
          <button type="submit" disabled={loading}>
            {loading ? "Carregando..." : isRegister ? "Registrar" : "Entrar"}
          </button>
        </form>
        <p className="toggle-mode">
          {isRegister ? "Já tem uma conta?" : "Não tem conta?"}{" "}
          <button type="button" onClick={() => setIsRegister(!isRegister)}>
            {isRegister ? "Faça login" : "Registre-se"}
          </button>
        </p>
      </div>
    </div>
  );
}