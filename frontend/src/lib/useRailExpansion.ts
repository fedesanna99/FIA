/**
 * useRailExpansion (v2.6.5 D.1 → v2.6.6 E.2 promosso a `lib/` per riuso).
 *
 * Gestione expanded/collapsed state della rail (sia ShellRail custom v2.6.x
 * che LeftRail legacy chrome) con persistenza localStorage condivisa.
 *
 * Single source of truth: stessa chiave `feapro:rail:expanded` per Shell
 * custom e legacy. Comportamento atteso: l'utente che comprime in workspace
 * trova la rail compressa anche tornando in home, e viceversa.
 *
 * Default expanded=true (nuovo comportamento Dashboard A1). Utenti che
 * preferiscono icon-only collapsed possono salvare la preference via
 * toggle nel rail.
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
