/**
 * EmptyModelOverlay (P2 bug fix).
 *
 * Overlay sopra il Viewport3D quando il modello attivo esiste ma è
 * vuoto (nodes=0 && elements=0). Caso tipico: utente clicca "Nuovo
 * modello", il dialog crea un modello vuoto, ma il viewport mostra
 * solo griglia + gizmo → l'utente si confonde pensando che il modello
 * sia rotto.
 *
 * L'overlay spiega:
 *   1. Cosa sta succedendo ("Modello vuoto")
 *   2. Cosa fare (aggiungere geometria da Make, o caricare template)
 *   3. CTA dirette: [Apri Make] [Carica template]
 *
 * Pointer-events-auto solo sui bottoni; il resto del viewport rimane
 * interattivo (orbit/zoom funzionano sopra l'overlay).
 */
import { Box, Layers, Hammer } from "lucide-react";
import { useModelStore } from "../../store/modelStore";
import { useLeftRailStore } from "../../store/leftRailStore";
import { useWorkspaceStore } from "../../store/workspaceStore";

export function EmptyModelOverlay() {
  const model = useModelStore((s) => s.model);
  if (!model) return null;
  const nNodes = model.nodes?.length ?? 0;
  const nElems = model.elements?.length ?? 0;
  if (nNodes !== 0 || nElems !== 0) return null;

  function openMake() {
    useWorkspaceStore.getState().setWorkspace("model");
    useLeftRailStore.getState().open("model");
  }

  function openTemplateGallery() {
    window.dispatchEvent(new CustomEvent("feapro:open-template-gallery"));
  }

  return (
    <div
      className="absolute inset-0 z-[5] flex items-center justify-center pointer-events-none"
      data-testid="empty-model-overlay"
    >
      <div className="pointer-events-auto bg-bg-panel/95 backdrop-blur-sm border border-border rounded-lg shadow-elev px-6 py-5 max-w-md mx-4 text-center">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-bg-info text-ink-info mb-3">
          <Box className="w-5 h-5" strokeWidth={1.8} />
        </div>
        <h3 className="text-base font-semibold text-ink mb-1">Modello vuoto</h3>
        <p className="text-[12px] text-ink-muted leading-relaxed mb-4">
          Aggiungi nodi ed elementi da <strong className="text-ink">Make → Geometria</strong>.
          <br />
          Oppure carica un template precaricato o un esempio didattico.
        </p>
        <div className="flex flex-wrap gap-2 justify-center">
          <button
            type="button"
            onClick={openMake}
            data-testid="empty-model-open-make"
            className="inline-flex items-center gap-1.5 bg-accent text-white text-xs font-medium px-3 py-1.5 rounded-md hover:bg-accent-hover transition-colors"
          >
            <Hammer className="w-3.5 h-3.5" strokeWidth={1.8} />
            Apri Make
          </button>
          <button
            type="button"
            onClick={openTemplateGallery}
            data-testid="empty-model-open-template"
            className="inline-flex items-center gap-1.5 bg-bg-elevated text-ink border border-border text-xs font-medium px-3 py-1.5 rounded-md hover:bg-bg-hover transition-colors"
          >
            <Layers className="w-3.5 h-3.5" strokeWidth={1.8} />
            Carica template
          </button>
        </div>
      </div>
    </div>
  );
}
