/**
 * AuthGate (v2.7.0 Phase 4.1) — gatekeeper di App via React Router redirect.
 *
 * Refactor da v2.1.4 auth-gate:
 *   - Prima: rendeva inline `<AuthScreen />` quando non autenticato.
 *   - Adesso: redirect a `/login` via `useNavigate`. AuthScreen.tsx legacy
 *     è stato rimosso (D.5 brief v2.7.0). Le 4 pages auth (LoginPage /
 *     SignupPage / ForgotPasswordPage / EmailVerifyPage) vivono in
 *     `frontend/src/auth/` sotto `<AuthLayout />` route-mounted.
 *
 * Stati gestiti:
 *   1. `bootstrapping`: spinner full-screen mentre verifyToken() gira al boot
 *   2. `unauthenticated`: redirect a `/login` (preserva `from` in state)
 *   3. `authenticated`: mostra `children` (la webapp normale via App.tsx)
 *
 * Invoca `authStore.bootstrap()` al mount (idempotente). Il render è
 * gated da `bootstrapping || !token || !user` → mostra BootSplash finché
 * il redirect non avviene o finché l'utente non è verificato.
 *
 * Nota: AuthGate ora richiede di essere montato dentro `<BrowserRouter>`
 * (da main.tsx). Test che render AuthGate fuori da router devono wrappare
 * con `<MemoryRouter>`.
 */
import { useEffect, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { useAuthStore } from "../../store/authStore";


export function AuthGate({ children }: { children: ReactNode }) {
  const bootstrapping = useAuthStore((s) => s.bootstrapping);
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const bootstrap = useAuthStore((s) => s.bootstrap);
  const navigate = useNavigate();
  const location = useLocation();

  // One-shot al mount. La funzione è idempotente (vedi authStore).
  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  // Redirect a /login quando bootstrap finito e utente non autenticato.
  // Preserva il path corrente in state.from per redirect post-login.
  useEffect(() => {
    if (!bootstrapping && (!token || !user)) {
      navigate("/login", {
        replace: true,
        state: { from: location.pathname },
      });
    }
  }, [bootstrapping, token, user, navigate, location.pathname]);

  // Finché bootstrap non finisce o l'utente non è autenticato, mostra
  // splash (il redirect a /login avviene via useEffect sopra; lo splash
  // è il fallback durante la transizione).
  if (bootstrapping || !token || !user) {
    return <BootSplash />;
  }

  return <>{children}</>;
}


/**
 * BootSplash — spinner minimal mostrato durante /api/auth/me al boot
 * oppure durante la transizione di redirect a /login.
 */
function BootSplash() {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-bg"
      data-testid="auth-boot-splash"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-3 animate-fade-in">
        <div className="w-10 h-10 bg-accent/10 border border-accent/40 flex items-center justify-center">
          <span className="text-accent text-base font-bold font-display">F</span>
        </div>
        <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wide-1 text-ink-3 font-semibold">
          <span className="inline-block w-3 h-3 border-[1.5px] border-ink-3/40 border-t-accent animate-spin" />
          <span>FEA Pro · avvio…</span>
        </div>
      </div>
    </div>
  );
}
