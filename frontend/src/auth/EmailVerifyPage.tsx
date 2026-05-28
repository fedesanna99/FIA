/**
 * EmailVerifyPage · v2.7.0 Phase 4.1 mockup-driven (F.7 completa)
 *
 * State 4 di 4 (VERIFY). Implementazione completa secondo mockup
 * ui_kits/webapp_desktop/Auth.html righe 366-407.
 *
 * D.4=A LOCKED · mock UI honest:
 *   In produzione il flow signup → redirect diretto a "/" (backend default
 *   utente=verified, NO email confirmation step). Questa page è
 *   accessibile SOLO via URL diretto `/verify-email?email=...&token=...`
 *   per testing visivo del mockup state. Il submit OTP NON chiama backend
 *   (endpoint non esiste); mostra toast info onesto.
 *
 * Layout (mockup):
 *   - card centered (`card-head-center` + `auth-card-verify` modifier)
 *   - verify-icon 64x64 cyan + Mail icon
 *   - eyebrow "Quasi pronto" + title "Verifica la tua email"
 *   - sub: spiega email destinataria + 10 minuti scadenza
 *   - OTP 6 cells auto-advance + backspace prev
 *   - Primary "Verifica e accedi" (disabled se OTP < 6 char)
 *   - resend-row "Non ricevuto? Reinvia codice" + countdown "in M:SS"
 *   - footer "Email sbagliata? Ricrea l'account" → /signup
 *
 * Countdown: 60s initial, decrement ogni 1s, format M:SS. Quando arriva a
 * 0, il button "Reinvia codice" diventa cliccabile.
 *
 * Email destinataria: letta da query param `?email=...` (URL-encoded).
 * Se mancante, mostra placeholder generico "alla tua email".
 *
 * Reference mockup: ui_kits/webapp_desktop/Auth.html righe 366-407.
 */
import { useEffect, useState } from "react";
import { Mail } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { toast } from "../store/toastStore";

import { AuthCard } from "./components/AuthCard";
import { OTPInput } from "./components/OTPInput";


const RESEND_COUNTDOWN_SECONDS = 60;
const OTP_LENGTH = 6;


function formatCountdown(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}


export function EmailVerifyPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  // v3.1.2 audit-fix L1-22: clamp email param a 256 char per prevenire
  // layout-bomb (10KB blastano la card senza XSS, ma rovinano la UI).
  const email = (params.get("email") ?? "").slice(0, 256);
  const [otp, setOtp] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(RESEND_COUNTDOWN_SECONDS);

  // v3.1.1 audit-fix L1-1: countdown decrement ogni 1s, deps array vuoto.
  // Prima `[resendCountdown]` ri-creava l'interval ad ogni tick (1Hz) →
  // spreco CPU + drift cumulativo su tab background. Ora il functional
  // setState legge il valore corrente senza dipendere dalla closure stale.
  useEffect(() => {
    const id = window.setInterval(() => {
      setResendCountdown((sec) => (sec > 0 ? sec - 1 : 0));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const canResend = resendCountdown === 0;
  const canSubmit = otp.length === OTP_LENGTH && !submitting;

  async function handleVerify(): Promise<void> {
    if (!canSubmit) return;
    // v3.1.2 audit-fix L1-18: mock-honest UX. Prima `setSubmitting(true/false)`
    // sincroni → il label "Verifica in corso…" non veniva mai visto. Ora un
    // micro-delay simula il roundtrip server → label visibile + feedback ok.
    setSubmitting(true);
    await new Promise<void>((resolve) => setTimeout(resolve, 400));
    toast(
      "success",
      "Email verificata (mock). In produzione l'account è già attivo dopo il signup — questa pagina è solo per il visual mockup.",
      6_000,
    );
    setSubmitting(false);
    navigate("/", { replace: true });
  }

  function handleResend() {
    if (!canResend) return;
    toast(
      "info",
      "Funzione resend email mock. In produzione il signup attiva l'account senza step verify.",
      5_000,
    );
    setResendCountdown(RESEND_COUNTDOWN_SECONDS);
  }

  const verifyIcon = (
    <div className="verify-icon" aria-hidden="true">
      <Mail width={28} height={28} />
    </div>
  );

  return (
    <AuthCard
      state="verify"
      centered
      icon={verifyIcon}
      eyebrow="Quasi pronto"
      title="Verifica la tua email"
      sub={
        <>
          {email ? (
            <>
              Abbiamo inviato un link di conferma a <b>{email}</b>.<br />
              Clicca il link entro <b>10 minuti</b> per attivare l'account.
            </>
          ) : (
            <>
              Abbiamo inviato un link di conferma alla tua email.
              <br />
              Clicca il link entro <b>10 minuti</b> per attivare l'account.
            </>
          )}
        </>
      }
      footer={
        <>
          Email sbagliata?{" "}
          <Link to="/signup" data-testid="auth-verify-recreate-link">
            Ricrea l'account
          </Link>
        </>
      }
    >
      <div className="card-form">
        <div className="otp-row">
          <span className="field-label">Inserisci codice a 6 cifre</span>
          <OTPInput
            length={OTP_LENGTH}
            value={otp}
            onChange={setOtp}
            disabled={submitting}
          />
        </div>

        <button
          type="button"
          className="btn-primary btn-lg"
          disabled={!canSubmit}
          onClick={handleVerify}
          data-testid="auth-verify-submit"
        >
          {submitting ? "Verifica in corso…" : "Verifica e accedi"}
        </button>

        <div className="resend-row" data-testid="auth-verify-resend-row">
          Non ricevuto?{" "}
          <button
            type="button"
            className="link-button"
            disabled={!canResend}
            onClick={handleResend}
            data-testid="auth-verify-resend-btn"
          >
            Reinvia codice
          </button>
          {!canResend && (
            <span className="resend-timer" data-testid="auth-verify-resend-timer">
              in {formatCountdown(resendCountdown)}
            </span>
          )}
        </div>
      </div>
    </AuthCard>
  );
}
