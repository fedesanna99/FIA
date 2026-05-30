/**
 * ModelliBrowser (Precision v2.0 PR16 T2 + MOD-1 refactor, 31/05/2026).
 *
 * Overlay full-screen wrapper sottile sopra <ModelsList />. Attivato via
 * custom event `feapro:open-models-list` (compat ⌘K + chiamate legacy).
 *
 * Pre-MOD-1: contieneva tutta la logica search/filtri/table/pagination
 * inline. Post-MOD-1: estratta in `ModelsList.tsx` componente puro,
 * riusato anche da `/modelli` page route (vedi `pages/PlaceholderPages.ModelliPage`).
 *
 * Dismiss: ESC + X icon nell'header.
 */
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { ModelsList } from "./ModelsList";


export function ModelliBrowser() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function handleOpen() {
      setOpen(true);
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape" && open) setOpen(false);
    }
    window.addEventListener("feapro:open-models-list", handleOpen);
    window.addEventListener("keydown", handleEsc);
    return () => {
      window.removeEventListener("feapro:open-models-list", handleOpen);
      window.removeEventListener("keydown", handleEsc);
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-dialog bg-bg flex flex-col animate-fade-in"
      role="dialog"
      aria-label="Modelli"
      data-testid="modelli-browser"
    >
      {/* Top close bar */}
      <div className="flex items-center justify-between border-b border-border bg-bg-panel px-4 py-2">
        <div className="font-mono text-[10px] uppercase tracking-wide-3 text-ink-3">
          Modelli · A2 Browser
        </div>
        <button
          type="button"
          aria-label="Chiudi"
          onClick={() => setOpen(false)}
          className="w-7 h-7 border border-border bg-bg-elevated grid place-items-center text-ink-2 hover:border-ink-3 hover:text-ink"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Content (riusa ModelsList puro) */}
      <div className="flex-1 overflow-auto">
        <ModelsList
          onModelSelected={(id) => {
            setOpen(false);
            window.dispatchEvent(new CustomEvent("feapro:select-model", { detail: { id } }));
          }}
          onActionStarted={() => setOpen(false)}
        />
      </div>
    </div>
  );
}
