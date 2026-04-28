import { useState } from "react";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider, ensureUserDocument, loginWithEmail, registerWithEmail } from "../firebase";

export default function EmailLogin() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);

    try {
      const result = await signInWithPopup(auth, googleProvider);
      await ensureUserDocument(result.user);
    } catch (err) {
      console.error(err);
      setError("Nao foi possivel entrar com Google.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (isRegister && password !== confirmPassword) {
      setError("As senhas nao coincidem.");
      return;
    }

    setLoading(true);

    try {
      if (isRegister) {
        await registerWithEmail(email, password, displayName);
      } else {
        const result = await loginWithEmail(email, password);
        await ensureUserDocument(result.user);
      }
    } catch (err) {
      console.error(err);

      switch (err.code) {
        case "auth/user-not-found":
          setError("Usuario nao encontrado.");
          break;
        case "auth/wrong-password":
        case "auth/invalid-credential":
          setError("Credenciais invalidas.");
          break;
        case "auth/email-already-in-use":
          setError("Esse e-mail ja esta cadastrado.");
          break;
        case "auth/weak-password":
          setError("A senha precisa ter pelo menos 6 caracteres.");
          break;
        default:
          setError("Erro ao autenticar. Tente novamente.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="auth-panel">
      <div className="auth-panel-header">
        <span className="panel-kicker">{isRegister ? "Cadastro" : "Login"}</span>
        <h2>{isRegister ? "Crie seu acesso ✨" : "Entrar no bolao 👋"}</h2>
        <p>{isRegister ? "Escolha o apelido que aparece no ranking." : "Acesse sua area de palpites e acompanhe sua pontuacao."}</p>
      </div>

      <button className="auth-social-button" onClick={handleGoogleLogin} disabled={loading} type="button">
        <span>G</span>
        <strong>{loading ? "Conectando..." : "Entrar com Google"}</strong>
      </button>

      <div className="auth-divider">
        <span>ou</span>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        {isRegister && (
          <label className="input-group">
            <span>Apelido</span>
            <input
              type="text"
              placeholder="Ex.: Rei do Palpite"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
            />
          </label>
        )}

        <label className="input-group">
          <span>E-mail</span>
          <input
            type="email"
            placeholder="voce@exemplo.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>

        <label className="input-group">
          <span>Senha</span>
          <input
            type="password"
            placeholder="Sua senha"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>

        {isRegister && (
          <label className="input-group">
            <span>Confirmar senha</span>
            <input
              type="password"
              placeholder="Repita sua senha"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
            />
          </label>
        )}

        {error && <div className="error-msg">{error}</div>}

        <button className="auth-submit-button" type="submit" disabled={loading}>
          {loading ? "Processando..." : isRegister ? "Criar conta" : "Entrar"}
        </button>
      </form>

      <div className="auth-footer">
        <span>{isRegister ? "Ja tem conta?" : "Ainda nao tem conta?"}</span>
        <button type="button" onClick={() => setIsRegister((current) => !current)}>
          {isRegister ? "Fazer login" : "Criar cadastro"}
        </button>
      </div>
    </section>
  );
}
