/**
 * MobilePanel (v1.5 Task 30) — wrapper full-screen per i pannelli mobile.
 *
 * Su mobile (< 768) i rails laterali sono nascosti. Quando l'utente tocca
 * una voce della MobileTabbar (Make/Solve/Risultati/Altro), il pannello
 * corrispondente viene aperto a tutto schermo dentro questo wrapper.
 *
 * Header: bottone back (chevron sinistro) + titolo. Body: scrollabile.
 */
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";


interface Props {
  title: string;
  onBack: () => void;
  children: ReactNode;
}


export function MobilePanel({ title, onBack, children }: Props) {
  return (
    <div
      className="absolute inset-0 bg-bg-panel z-30 flex flex-col"
      data-testid="mobile-panel"
      role="dialog"
      aria-label={title}
    >
      <header className="px-3.5 py-3 border-b border-border flex items-center gap-3 flex-shrink-0 bg-bg-panel">
        <button
          type="button"
          onClick={onBack}
          aria-label="Indietro"
          data-testid="mobile-panel-back"
          className="w-7 h-7 flex items-center justify-center text-ink-muted hover:text-ink transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="text-sm font-semibold text-ink flex-1 truncate">{title}</div>
      </header>
      <div className="flex-1 overflow-y-auto min-h-0">{children}</div>
    </div>
  );
}
