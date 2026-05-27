/**
 * SignupPage · v2.7.0 Phase 4.1 mockup-driven (F.3 stub placeholder)
 *
 * Stato 2 di 4 (SIGNUP). Stub minimale — implementazione completa con
 * 5 campi (nome, cognome, email, password, ruolo) + PasswordStrengthBars
 * + checkbox terms + react-hook-form + zod + backend extension
 * (migration Alembic + API esteso) arriva in F.5.
 *
 * Reference mockup: ui_kits/webapp_desktop/Auth.html righe 247-325.
 */
import { Link } from "react-router-dom";

export function SignupPage() {
  return (
    <section className="auth-card" data-state="signup" data-testid="auth-signup-page">
      <header className="card-head">
        <span className="eyebrow">Crea il tuo account</span>
        <h2 className="card-title">Inizia in 30 secondi</h2>
        <p className="card-sub">
          Implementazione completa in F.5 (form 5 campi + password strength
          bars + backend extension migration).
        </p>
      </header>

      <footer className="card-foot">
        Hai già un account? <Link to="/login">Accedi</Link>
      </footer>
    </section>
  );
}
