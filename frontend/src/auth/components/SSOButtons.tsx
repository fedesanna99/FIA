/**
 * SSOButtons · v2.7.0 Phase 4.1 mockup-driven (F.4)
 *
 * Row Google + GitHub SSO. Brief decisione 4 (LOCKED): UI mockup-identical
 * MA `onClick` → toast info "SSO in arrivo, usa email/password per ora".
 * Backend non ha (ancora) OAuth flow. NO mock OAuth. NO redirect a
 * provider.
 *
 * SVG path estratti verbatim da Auth.html righe 230-238.
 *
 * Reference mockup: ui_kits/webapp_desktop/Auth.html righe 229-238.
 */
import { toast } from "../../store/toastStore";

export function SSOButtons() {
  return (
    <div className="sso-row" data-testid="auth-sso-row">
      <button
        type="button"
        className="btn-secondary sso-btn"
        data-testid="auth-sso-google"
        onClick={() => toast("info", "SSO Google in arrivo — usa email/password per ora")}
      >
        <svg width={14} height={14} viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M21.35 11.1H12v3.8h5.35c-.25 1.45-1.5 4.25-5.35 4.25-3.22 0-5.85-2.67-5.85-5.95 0-3.28 2.63-5.95 5.85-5.95 1.83 0 3.06.78 3.76 1.45l2.57-2.47C16.79 4.7 14.6 3.75 12 3.75c-4.79 0-8.65 3.88-8.65 8.65s3.86 8.65 8.65 8.65c5 0 8.3-3.5 8.3-8.45 0-.58-.06-1.02-.15-1.5z"
            fill="#4285f4"
          />
        </svg>
        Continua con Google
      </button>
      <button
        type="button"
        className="btn-secondary sso-btn"
        data-testid="auth-sso-github"
        onClick={() => toast("info", "SSO GitHub in arrivo — usa email/password per ora")}
      >
        <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.1.39-1.99 1.03-2.69-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33s1.71.11 2.5.33c1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.69 0 3.84-2.34 4.68-4.57 4.93.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2z" />
        </svg>
        Continua con GitHub
      </button>
    </div>
  );
}
