/**
 * Theme store — gestisce dark/light/system con persistenza localStorage.
 *
 * Applica `data-theme="dark"` o `data-theme="light"` sull'elemento `<html>`,
 * letto poi dalle CSS variables in `index.css`.
 *
 * - `mode = "system"` → segue `prefers-color-scheme` con MediaQueryList listener.
 * - `mode = "dark" | "light"` → forza il tema esplicitamente.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeMode = "dark" | "light" | "system";
export type ResolvedTheme = "dark" | "light";

interface ThemeState {
  mode: ThemeMode;
  resolved: ResolvedTheme;
  setMode: (m: ThemeMode) => void;
  /** Cycle dark → light → system → dark. */
  cycle: () => void;
  /** Da chiamare in App.tsx una volta: registra listener system. */
  init: () => () => void;
}

function systemPref(): ResolvedTheme {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function apply(resolved: ResolvedTheme) {
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("data-theme", resolved);
    document.documentElement.style.colorScheme = resolved;
  }
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      // Default "system": rispetta la preferenza OS dell'utente. Cambiato
      // da "dark" hard-coded in alpha.16 per allinearsi al mockup v1.3 che
      // ha entrambe le palette equivalenti per qualita'.
      mode: "system",
      resolved: systemPref(),

      setMode: (m) => {
        const r = m === "system" ? systemPref() : m;
        apply(r);
        set({ mode: m, resolved: r });
      },

      cycle: () => {
        const next: ThemeMode =
          get().mode === "dark" ? "light"
          : get().mode === "light" ? "system"
          : "dark";
        get().setMode(next);
      },

      init: () => {
        // Applica subito il tema risolto da storage
        const m = get().mode;
        const r = m === "system" ? systemPref() : m;
        apply(r);
        set({ resolved: r });

        // Listener per cambio prefers-color-scheme quando mode=system
        if (typeof window === "undefined" || !window.matchMedia) return () => {};
        const mq = window.matchMedia("(prefers-color-scheme: light)");
        const handler = () => {
          if (get().mode === "system") {
            const r2 = systemPref();
            apply(r2);
            set({ resolved: r2 });
          }
        };
        mq.addEventListener("change", handler);
        return () => mq.removeEventListener("change", handler);
      },
    }),
    {
      name: "feapro-theme",
      partialize: (s) => ({ mode: s.mode }),
    },
  ),
);
