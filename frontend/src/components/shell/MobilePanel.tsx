/**
 * MobilePanel (v1.5 Task 30, esteso v1.8.5 T2) — wrapper full-screen
 * per i pannelli mobile.
 *
 * Su mobile (< 768) i rails laterali sono nascosti. Quando l'utente tocca
 * una voce della MobileTabbar (Make/Solve/Risultati/Altro), il pannello
 * corrispondente viene aperto a tutto schermo dentro questo wrapper.
 *
 * Header: bottone back (chevron sinistro) + titolo. Body: scrollabile.
 *
 * v1.8.5 T2 · swipe-back gesture (iOS-style):
 *   - Touch deve iniziare entro 40px dal bordo sinistro (edge-swipe).
 *   - Se delta-x > 80px e tempo < 600ms → chiude il panel (onBack).
 *   - Altrimenti il gesture viene ignorato (il body resta scrollabile).
 */
import { ArrowLeft } from "lucide-react";
import { useRef, type ReactNode, type TouchEvent } from "react";


interface Props {
  title: string;
  onBack: () => void;
  children: ReactNode;
}


const EDGE_THRESHOLD = 40;     // px dal bordo sinistro per attivare il gesture
const SWIPE_THRESHOLD = 80;    // px di delta orizzontale per chiudere
const SWIPE_TIMEOUT_MS = 600;  // ms entro cui completare lo swipe


export function MobilePanel({ title, onBack, children }: Props) {
  const startRef = useRef<{ x: number; y: number; t: number } | null>(null);

  function handleTouchStart(e: TouchEvent<HTMLDivElement>) {
    const t = e.touches[0];
    if (!t) return;
    // Edge-swipe: registra solo se inizia vicino al bordo sinistro.
    if (t.clientX > EDGE_THRESHOLD) {
      startRef.current = null;
      return;
    }
    startRef.current = { x: t.clientX, y: t.clientY, t: Date.now() };
  }

  function handleTouchEnd(e: TouchEvent<HTMLDivElement>) {
    const start = startRef.current;
    startRef.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    if (!t) return;
    const dx = t.clientX - start.x;
    const dy = Math.abs(t.clientY - start.y);
    const elapsed = Date.now() - start.t;
    // Swipe orizzontale dominante (no scroll verticale ambiguo).
    if (dx >= SWIPE_THRESHOLD && dy < 60 && elapsed < SWIPE_TIMEOUT_MS) {
      onBack();
    }
  }

  return (
    <div
      className="absolute inset-0 bg-bg-panel z-30 flex flex-col"
      data-testid="mobile-panel"
      role="dialog"
      aria-label={title}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <header className="px-3.5 py-3 border-b border-border flex items-center gap-3 flex-shrink-0 bg-bg-panel">
        <button
          type="button"
          onClick={onBack}
          aria-label="Indietro"
          data-testid="mobile-panel-back"
          className="w-7 h-7 flex items-center justify-center text-ink-3 hover:text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 rounded"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="text-sm font-semibold text-ink flex-1 truncate">{title}</div>
      </header>
      <div className="flex-1 overflow-y-auto min-h-0">{children}</div>
    </div>
  );
}
