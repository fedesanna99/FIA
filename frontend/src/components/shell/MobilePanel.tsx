/**
 * MobilePanel (v1.5 Task 30 · v1.8.5 T2 · v2.1.6 nav-dedup) — wrapper
 * full-screen per i pannelli mobile.
 *
 * Su mobile (< 768) i rails laterali sono nascosti. Quando l'utente tocca
 * una voce della MobileTabbar (Make/Solve/Risultati/Altro), il pannello
 * corrispondente viene aperto a tutto schermo dentro questo wrapper.
 *
 * Header: bottone back (chevron sinistro) + titolo. Body: scrollabile.
 *
 * v2.1.6 (nav-dedup): single source of truth per l'header.
 *   - Title prop = root statico assegnato da App.tsx (es. "Verifiche")
 *   - `panelHeaderStore.current` (set da PanelBreadcrumb quando drill-in
 *     attivo) viene appeso al titolo come "Verifiche · Live".
 *   - Back-arrow è SMART:
 *       drill-in attivo (popDrillIn !== null) → call popDrillIn() (torna al hub)
 *       hub mode → call props.onBack (chiude il pannello)
 *   - PanelChrome + PanelBreadcrumb su mobile non renderizzano più i propri
 *     header → niente più 4 intestazioni sovrapposte.
 *
 * v1.8.5 T2 · swipe-back gesture (iOS-style):
 *   - Touch deve iniziare entro 40px dal bordo sinistro (edge-swipe).
 *   - Se delta-x > 80px e tempo < 600ms → triggera back-smart.
 *   - Altrimenti il gesture viene ignorato (il body resta scrollabile).
 */
import { ArrowLeft } from "lucide-react";
import { useRef, type ReactNode, type TouchEvent } from "react";

import { usePanelHeaderStore } from "../../store/panelHeaderStore";


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

  // v2.1.6 nav-dedup: leggi drill-in state dal panelHeaderStore.
  const current = usePanelHeaderStore((s) => s.current);
  const popDrillIn = usePanelHeaderStore((s) => s.popDrillIn);

  // Effective title: "Verifiche · Live" quando drill-in attivo.
  const effectiveTitle = current ? `${title} · ${current}` : title;
  const isDrilledIn = !!popDrillIn;

  // Smart back: drill-in → pop al hub; hub mode → chiudi il pannello.
  function handleBack() {
    if (popDrillIn) {
      popDrillIn();
    } else {
      onBack();
    }
  }

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
      handleBack();
    }
  }

  return (
    <div
      className="absolute inset-0 bg-bg-panel z-30 flex flex-col animate-slide-right"
      data-testid="mobile-panel"
      role="dialog"
      aria-label={effectiveTitle}
      aria-modal="true"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <header className="px-3.5 py-3 border-b border-border flex items-center gap-3 flex-shrink-0 bg-bg-elevated">
        <button
          type="button"
          onClick={handleBack}
          aria-label={isDrilledIn ? `Torna a ${title}` : "Indietro"}
          data-testid="mobile-panel-back"
          className="w-8 h-8 flex items-center justify-center text-ink-3 hover:text-ink hover:bg-bg-hover transition-colors focus-visible:outline-none focus-visible:border focus-visible:border-accent"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Quando drill-in attivo mostro: root piccolo sopra + current grande sotto.
              Riprende il pattern iOS dei dual-line header (es. "Settings › Display") */}
          {isDrilledIn ? (
            <>
              <span className="font-mono text-[10px] uppercase tracking-wide-1 text-ink-3 leading-none truncate" data-testid="mobile-panel-root">
                {title}
              </span>
              <span className="font-display text-base font-semibold tracking-tight-1 text-ink leading-tight truncate mt-0.5" data-testid="mobile-panel-current">
                {current}
              </span>
            </>
          ) : (
            <span className="font-display text-base font-semibold tracking-tight-1 text-ink truncate" data-testid="mobile-panel-title">
              {title}
            </span>
          )}
        </div>
      </header>
      {/* v2.1.5 mobile-fix: overflow-x-hidden + min-w-0 evitano che children
          con contenuto ampio (tabelle Verify, label uppercase tracking-wide,
          ecc.) spingano il pannello fuori dal viewport 375px. */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 min-w-0">{children}</div>
    </div>
  );
}
