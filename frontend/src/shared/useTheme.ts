// v2.6.1 foundation · Soft v2.1 theme switch
//
// Hook minimal che legge/scrive `data-theme` su <html> e persiste in
// localStorage. Tokens.css supporta `:root[data-theme="dark"]` per la
// palette dark — quando l'attributo cambia, tutti i `var(--bg)`, `var(--ink)`,
// ecc. si aggiornano automaticamente.
//
// NB: questa Fase 1 NON applica ancora il provider in App.tsx. Sarà cablato
// in Fase 2 (Shell) quando il design new sostituirà il layout esistente.

import { useEffect, useState } from "react";

type Theme = "light" | "dark";
const STORAGE_KEY = "feapro.theme";

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") return "light";
    return (localStorage.getItem(STORAGE_KEY) as Theme) ?? "light";
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  return [theme, setThemeState] as const;
}
