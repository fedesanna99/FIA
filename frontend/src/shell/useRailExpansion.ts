/**
 * useRailExpansion (v2.6.5 D.1) — gestione expanded/collapsed state della
 * `<ShellRail>` con persistenza localStorage.
 *
 * Default expanded=true (nuovo comportamento Dashboard A1). Utenti che
 * preferiscono icon-only collapsed possono salvare la preference via
 * toggle nel rail.
 *
 * Single source of truth: Shell.tsx + ShellRail.tsx leggono dallo stesso
 * hook per mantenere la grid `shell-mid` coerente con il rail width.
 */
import { useEffect, useState } from "react";

const STORAGE_KEY = "feapro:rail:expanded";

export function useRailExpansion() {
  const [isExpanded, setExpanded] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      // Default true (expanded) per nuovi utenti / utenti pre-v2.6.5.
      return stored === null ? true : stored === "true";
    } catch {
      return true;
    }
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, String(isExpanded));
    } catch {
      // Storage può fallire (modalità incognito + quota strict). Best-effort.
    }
  }, [isExpanded]);

  return { isExpanded, setExpanded };
}
