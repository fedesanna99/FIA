/**
 * ForgotPasswordPage · v2.7.0 Phase 4.1 mockup-driven (F.3 stub placeholder)
 *
 * Stato 3 di 4 (FORGOT). Stub minimale — implementazione completa con
 * form Email autofocus + info-banner + submit handler → toast onesto
 * "in arrivo, contatta supporto@feapro.dev" (decisione D.3=A: mock UI,
 * no SMTP setup) arriva in F.6.
 *
 * Reference mockup: ui_kits/webapp_desktop/Auth.html righe 328-363.
 */
import { Link } from "react-router-dom";

export function ForgotPasswordPage() {
  return (
    <section className="auth-card" data-state="forgot" data-testid="auth-forgot-page">
      <header className="card-head">
        <Link to="/login" className="card-back" data-testid="auth-back-to-login">
          ← Torna al login
        </Link>
        <span className="eyebrow">Recupera password</span>
        <h2 className="card-title">Ti rimandiamo dentro<br />in 2 minuti</h2>
        <p className="card-sub">
          Implementazione completa in F.6 (form Email + info-banner + toast
          onesto "in arrivo, contatta supporto").
        </p>
      </header>

      <footer className="card-foot">
        Hai ricordato? <Link to="/login">Torna al login</Link>
      </footer>
    </section>
  );
}
