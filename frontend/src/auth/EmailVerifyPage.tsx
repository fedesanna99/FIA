/**
 * EmailVerifyPage · v2.7.0 Phase 4.1 mockup-driven (F.3 stub placeholder)
 *
 * Stato 4 di 4 (VERIFY). Stub minimale — implementazione completa con
 * card centered + verify-icon 64x64 + OTPInput 6 cells auto-advance
 * + resend countdown 60s + flow simulato (D.4=A: mock UI, backend
 * default verified=true post-signup, page accessibile per testing via
 * /verify-email?token=...) arriva in F.7.
 *
 * Reference mockup: ui_kits/webapp_desktop/Auth.html righe 366-407.
 */
import { Link } from "react-router-dom";

export function EmailVerifyPage() {
  return (
    <section
      className="auth-card auth-card-verify"
      data-state="verify"
      data-testid="auth-verify-page"
    >
      <header className="card-head card-head-center">
        <span className="eyebrow">Quasi pronto</span>
        <h2 className="card-title">Verifica la tua email</h2>
        <p className="card-sub">
          Implementazione completa in F.7 (OTP 6 cells + resend countdown
          + flow simulato).
        </p>
      </header>

      <footer className="card-foot">
        Email sbagliata? <Link to="/signup">Ricrea l'account</Link>
      </footer>
    </section>
  );
}
