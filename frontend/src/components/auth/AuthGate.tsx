/**
 * AuthGate (v2.1.4 auth-gate) — gatekeeper di App.
 *
 * Stati gestiti:
 *   1. `bootstrapping`: spinner full-screen mentre verifyToken() gira al boot
 *   2. `unauthenticated`: mostra <AuthScreen /> (login obbligatorio)
 *   3. `authenticated`: mostra `children` (la webapp normale)
 *
 * Invoca `authStore.bootstrap()` al mount: legge il token persistito,
 * lo valida contro /api/auth/me e — se valido — popola user. Se non c'è
 * token o il token è scaduto, va in stato unauthenticated e mostra
 * l'AuthScreen.
 */
import { useEffect, type ReactNode } from "react";

import { useAuthStore } from "../../store/authStore";
import { AuthScreen } from "./AuthScreen";


export function AuthGate({ children }: { children: ReactNode }) {
  const bootstrapping = useAuthStore((s) => s.bootstrapping);
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const bootstrap = useAuthStore((s) => s.bootstrap);

  // One-shot al mount. La funzione è idempotente (vedi authStore).
  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  if (bootstrapping) {
    return <BootSplash />;
  }

  const authenticated = !!token && !!user;
  if (!authenticated) {
    return <AuthScreen />;
  }

  return <>{children}</>;
}


/**
 * BootSplash — spinner minimal mostrato durante /api/auth/me al boot.
 * Visibile solo per ~100-400ms quindi senza animazioni eccessive.
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
