/**
 * Auth store (alpha.14 · esteso v2.1.4 auth-gate).
 *
 * Persiste JWT bearer + user info per cross-tab. Storage key: "auth-store".
 *
 * v2.1.4 auth-gate:
 *   - `bootstrapping` flag: true durante la verifica del token al boot.
 *   - `bootstrap()`: chiama verifyToken (se c'è un token), poi spegne il flag.
 *     Va invocato una sola volta da App al mount. Idempotente.
 *   - Listener globale su `window.feapro:auth-invalidated`: il client axios
 *     dispatcha questo event quando un 401 risponde su endpoint authenticated.
 *     Lo store risponde con logout() così l'AuthGate riappare automaticamente.
 *
 * NON contiene la password (mai persisterla). Il token è single-source-of-
 * truth: scaduto/invalido → logout silenzioso.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { AuthUser } from "../api/auth";
import { getMe } from "../api/auth";


interface AuthState {
  token: string;
  user: AuthUser | null;
  /** True durante la verifica del token al boot (mostra spinner nell'AuthGate). */
  bootstrapping: boolean;
  /** Imposta token + user dopo register/login riuscito. */
  setAuth: (token: string, user: AuthUser) => void;
  /** Pulisce tutto (logout). */
  logout: () => void;
  /** Verifica il token corrente contro /api/auth/me; se fallisce → logout. */
  verifyToken: () => Promise<boolean>;
  /**
   * Boot one-shot: se c'è un token persistito, valida con verifyToken().
   * Se non c'è token, spegne subito bootstrapping. Idempotente.
   */
  bootstrap: () => Promise<void>;
  /** True se utente loggato (token + user presenti). */
  isLoggedIn: () => boolean;
}


let bootstrapPromise: Promise<void> | null = null;


/**
 * v3.1.1 audit-fix L1-5: distinguere errori "auth invalid" (401) da
 * network/server transient (no response / 5xx / timeout). Logout solo
 * sul primo caso così l'utente non perde sessione per backend down.
 */
function isAuthFailure(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const resp = (err as { response?: { status?: number } }).response;
  if (!resp || typeof resp.status !== "number") return false;
  return resp.status === 401 || resp.status === 403;
}


export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: "",
      user: null,
      bootstrapping: true,
      setAuth: (token, user) => set({ token, user, bootstrapping: false }),
      logout: () => set({ token: "", user: null, bootstrapping: false }),
      verifyToken: async () => {
        const tok = get().token;
        if (!tok) {
          return false;
        }
        try {
          const user = await getMe(tok);
          set({ user });
          return true;
        } catch (err) {
          // v3.1.1 audit-fix L1-5: distinguere 401 da network/5xx. Solo su
          // 401 il token è realmente invalido → logout. Errori di rete o
          // server (5xx) NON devono buttare giù la sessione (utente vede
          // app pulita post-deploy, non perde lavoro per backend transient).
          if (isAuthFailure(err)) {
            set({ token: "", user: null });
            return false;
          }
          // Errori transient: mantieni token+user, ritorna false così
          // l'AuthGate riprova al prossimo bootstrap.
          return false;
        }
      },
      bootstrap: async () => {
        // Idempotent: la prima chiamata fa il lavoro, le successive aspettano
        // la stessa promise.
        if (bootstrapPromise) return bootstrapPromise;
        bootstrapPromise = (async () => {
          const tok = get().token;
          if (!tok) {
            set({ bootstrapping: false });
            return;
          }
          try {
            const user = await getMe(tok);
            set({ user, bootstrapping: false });
          } catch (err) {
            // v3.1.1 audit-fix L1-5: solo 401 = logout. Network/5xx = mantieni
            // sessione (con `user` precedentemente persistito) per non perdere
            // l'utente quando il backend è down al boot.
            if (isAuthFailure(err)) {
              set({ token: "", user: null, bootstrapping: false });
            } else {
              // Conserva token; user può rimanere quello persistito (può
              // essere stale ma è ok per UX offline-first).
              set({ bootstrapping: false });
            }
          }
        })();
        return bootstrapPromise;
      },
      isLoggedIn: () => {
        const s = get();
        return !!s.token && !!s.user;
      },
    }),
    {
      name: "auth-store",
      // Non persistere `bootstrapping` (volatile, sempre true al boot).
      partialize: (s) => ({ token: s.token, user: s.user }),
    },
  ),
);


// ── Auto-logout su 401 ──────────────────────────────────────────────────────
// Il client axios dispatcha `feapro:auth-invalidated` quando un endpoint
// risponde 401. Ciò capita se il token scade durante l'uso. Resettiamo lo
// store così l'AuthGate ri-appare e l'utente fa di nuovo login.
if (typeof window !== "undefined") {
  window.addEventListener("feapro:auth-invalidated", () => {
    useAuthStore.getState().logout();
  });
}
