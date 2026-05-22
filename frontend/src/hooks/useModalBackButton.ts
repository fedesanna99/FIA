/**
 * useModalBackButton (v1.6 Sprint 0 · B08) — back hardware mobile chiude modal.
 *
 * Su iOS (swipe back dal bordo sinistro) e Android (gesture o tasto back),
 * il browser propaga un popstate. Senza intercetto, l'utente naviga via
 * dalla pagina anche se ha solo un modal aperto.
 *
 * Pattern History API:
 *   1. Quando il modal si apre → history.pushState({ modal: true }, "")
 *   2. Quando l'utente preme back → popstate → chiama onClose()
 *   3. Quando il modal si chiude per altri motivi (ESC, click outside,
 *      bottone X) → history.back() per non lasciare uno state spurio.
 *
 * Idempotente: piu' modal annidati gestiscono stack autonomamente
 * (ogni hook pusha il proprio state).
 *
 * Esempio:
 *   ```tsx
 *   const [open, setOpen] = useState(false);
 *   useModalBackButton(open, () => setOpen(false));
 *   ```
 */
import { useEffect } from "react";


export function useModalBackButton(isOpen: boolean, onClose: () => void): void {
  useEffect(() => {
    if (!isOpen) return;
    if (typeof window === "undefined" || typeof history === "undefined") return;

    // Pushiamo uno state fittizio col timestamp per distinguerlo dagli
    // altri pushState dell'app (es. router).
    const modalStateMarker = { modal: true, t: Date.now() };
    history.pushState(modalStateMarker, "");

    const handler = (_e: PopStateEvent) => {
      // Il back e' stato premuto: chiudi il modal. NON pushare uno state
      // nuovo, altrimenti il successivo back rimane intrappolato.
      onClose();
    };

    window.addEventListener("popstate", handler);

    return () => {
      window.removeEventListener("popstate", handler);
      // Se il modal si chiude per altri motivi (ESC, click outside, X)
      // ma lo state fittizio e' ancora il top dello stack, lo rimuoviamo
      // per non lasciare history sporca. Best-effort: history.state
      // potrebbe essere stato sovrascritto da altri push.
      try {
        if (history.state && (history.state as { modal?: boolean }).modal) {
          history.back();
        }
      } catch {
        /* iOS Safari: history.back() puo' fallire in alcuni contesti. */
      }
    };
  }, [isOpen, onClose]);
}
