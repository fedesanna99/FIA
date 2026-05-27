/**
 * LoginPage · v2.7.0 Phase 4.1 mockup-driven (F.3 stub funzionale)
 *
 * Stato 1 di 4 (LOGIN). Stub funzionale completo per non bloccare il deploy
 * intermedio durante F.4-F.7. La versione completa con primitives shared
 * (AuthCard, AuthField, AuthDivider, SSOButtons), react-hook-form + zod,
 * show/hide password toggle, checkbox "Resta connesso", SSO row arriva in
 * F.4.
 *
 * Backward compat smoke E2E v2.6.2/v2.6.6: preservati data-testid
 * `auth-email`, `auth-password`, `auth-submit` (legacy AuthScreen rimossa
 * in F.3 ma testid mantengono lo stesso contratto per evitare regressioni
 * smoke E2E pre-esistenti che fanno login per la home dashboard).
 *
 * Reference mockup: ui_kits/webapp_desktop/Auth.html righe 182-244.
 */
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { login as apiLogin } from "../api/auth";
import { useAuthStore } from "../store/authStore";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmed = email.trim();
    if (!trimmed || !password) {
      setError("Email e password sono obbligatorie.");
      return;
    }

    setLoading(true);
    try {
      const res = await apiLogin(trimmed, password);
      setAuth(res.token, res.user);
      navigate("/", { replace: true });
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ??
        (err as Error)?.message ??
        "Errore sconosciuto";
      setError(humanizeLoginError(String(detail)));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="auth-card" data-state="login" data-testid="auth-login-page">
      <header className="card-head">
        <span className="eyebrow">Accedi al tuo studio</span>
        <h2 className="card-title">Bentornato</h2>
        <p className="card-sub">
          Continua il tuo lavoro su <b>UC1 · Trave bi-appoggiata</b> e altri 4
          progetti.
        </p>
      </header>

      <form className="card-form" onSubmit={handleSubmit} noValidate>
        <label className="field">
          <span className="field-label">Email</span>
          <div className="field-input">
            <input
              type="email"
              autoComplete="email"
              placeholder="federico@studio.it"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              data-testid="auth-email"
              required
            />
          </div>
        </label>

        <label className="field">
          <span className="field-label-row">
            <span className="field-label">Password</span>
            <Link className="field-aside" to="/forgot-password">
              Dimenticata?
            </Link>
          </span>
          <div className="field-input">
            <input
              type="password"
              autoComplete="current-password"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              data-testid="auth-password"
              required
            />
          </div>
        </label>

        {error && (
          <div className="info-banner" role="alert" data-testid="auth-error">
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          className="btn-primary btn-lg"
          disabled={loading}
          data-testid="auth-submit"
        >
          {loading ? "Attendere…" : "Entra in FEA Pro"}
        </button>
      </form>

      <footer className="card-foot">
        Non hai un account?{" "}
        <Link to="/signup" data-testid="auth-go-signup">
          Creane uno gratuito
        </Link>
      </footer>
    </section>
  );
}

/**
 * Traduce gli errori più comuni del backend `/api/auth/login` in italiano.
 * Estratto da AuthScreen legacy.
 */
function humanizeLoginError(detail: string): string {
  const lower = detail.toLowerCase();
  if (lower.includes("invalid email or password")) {
    return "Email o password non validi.";
  }
  if (lower.includes("network") || lower.includes("failed to fetch")) {
    return "Impossibile contattare il server. Riprova fra qualche secondo.";
  }
  return detail;
}
