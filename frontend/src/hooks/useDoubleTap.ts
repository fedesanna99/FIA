/**
 * useDoubleTap — hook React per detection doppio-tap via onClick.
 *
 * v3.4 Fetta M5 mobile (30/05/2026 mattina). Pattern ADR 004 D6:
 * "viewport doppio-tap = focus mode full-screen" — escape valve quando
 * l'utente vuole massimo spazio per il viewport 3D senza chrome.
 *
 * Implementazione semplice senza touch events nativi: usa onClick (che
 * il browser triggera affidabilmente su tap mobile + click desktop).
 * Conta tap consecutivi entro `DOUBLE_TAP_THRESHOLD_MS` (300ms): se 2
 * arrivano in finestra, chiama `onDoubleTap()`. Skipping intelligente
 * sugli elementi interattivi (button/a/input/[role=button]): un tap
 * sull'HUD Zoom button NON conta come "tap sul viewport".
 *
 * Gate `enabled` (default true): permette al consumer di disattivare il
 * comportamento (es. `enabled={isMobile}` per renderlo mobile-only senza
 * interferire con i double-click mouse desktop).
 *
 * Usage:
 *   const isMobile = useIsMobile();
 *   const enterFocus = useWorkspaceStore((s) => s.enterEmptyState);
 *   const { onClick } = useDoubleTap(enterFocus, isMobile);
 *   return <section onClick={onClick}>...</section>;
 */
import { useCallback, useRef } from "react";
import type { MouseEvent } from "react";


const DOUBLE_TAP_THRESHOLD_MS = 300;

/**
 * Selector CSS per elementi interattivi. Tap su questi NON conta:
 * i bottoni HUD (Zoom, Ruler, Legend) sul viewport non devono
 * triggerare focus mode quando l'utente li usa.
 */
const INTERACTIVE_SELECTOR =
  'button, a, input, select, textarea, ' +
  '[role="button"], [role="link"], [role="menuitem"], [role="tab"]';


interface UseDoubleTapResult {
  onClick: (e: MouseEvent<HTMLElement>) => void;
}


export function useDoubleTap(
  onDoubleTap: () => void,
  enabled = true,
): UseDoubleTapResult {
  const lastTapRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onClick = useCallback(
    (e: MouseEvent<HTMLElement>) => {
      if (!enabled) return;
      // Skip tap su elementi interattivi (HUD buttons, links): non
      // contano come "tap sul viewport puro".
      const target = e.target as HTMLElement | null;
      if (target?.closest(INTERACTIVE_SELECTOR)) return;

      const now = Date.now();
      const elapsed = now - lastTapRef.current;

      if (elapsed > 0 && elapsed < DOUBLE_TAP_THRESHOLD_MS) {
        // Doppio tap entro threshold → trigger
        lastTapRef.current = 0;
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
        onDoubleTap();
      } else {
        // Primo tap (o tap dopo timeout): start window
        lastTapRef.current = now;
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          lastTapRef.current = 0;
          timerRef.current = null;
        }, DOUBLE_TAP_THRESHOLD_MS);
      }
    },
    [enabled, onDoubleTap],
  );

  return { onClick };
}
