/**
 * Auth store (alpha.14) — persiste JWT bearer + user info per cross-tab.
 *
 * Storage key: "auth-store" (zustand persist, localStorage).
 * - token: JWT bearer ("" se non loggato)
 * - user: AuthUser | null
 * - login/logout helpers
 *
 * NON contiene la password (mai persisterla). Il token e' single-source-of-
 * truth: scaduto/invalido → logout silenzioso. App.tsx puo' chiamare
 * `verifyToken()` al boot per re-validare e refreshare l'user.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { AuthUser } from "../api/auth";
import { getMe } from "../api/auth";


interface AuthState {
  token: string;
  user: AuthUser | null;
  /** Imposta token + user dopo register/login riuscito. */
  setAuth: (token: string, user: AuthUser) => void;
  /** Pulisce tutto (logout). */
  logout: () => void;
  /** Verifica il token corrente contro /api/auth/me; se fallisce → logout. */
  verifyToken: () => Promise<boolean>;
  /** True se utente loggato (token + user presenti). */
  isLoggedIn: () => boolean;
}


export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: "",
      user: null,
      setAuth: (token, user) => set({ token, user }),
      logout: () => set({ token: "", user: null }),
      verifyToken: async () => {
        const tok = get().token;
        if (!tok) {
          return false;
        }
        try {
          const user = await getMe(tok);
          set({ user });
          return true;
        } catch {
          set({ token: "", user: null });
          return false;
        }
      },
      isLoggedIn: () => {
        const s = get();
        return !!s.token && !!s.user;
      },
    }),
    {
      name: "auth-store",
    },
  ),
);
