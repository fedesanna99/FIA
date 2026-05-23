/**
 * ImportPanel (v1.5 Task 29).
 *
 * UI riassettata: al posto del form denso con 3 Card (DXF/IFC + default
 * material/section/tol) ora ospita un singolo bottone "Apri wizard" che
 * lancia ImportWizard 4-step. Il wizard gestisce tutto (fonte, file,
 * preview, conferma) ed e' riusabile anche da palette + Dashboard.
 *
 * Pre-v1.5: 3 Card + 2 DropZone (DXF/IFC) + Field default + useMutation.
 * Vedi `components/dialogs/wizards/ImportWizard.tsx` per la nuova UX.
 */
import { FileUp, ChevronRight } from "lucide-react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";


export function ImportPanel() {
  const openWizard = (source?: "dxf" | "ifc" | "json") => {
    window.dispatchEvent(
      new CustomEvent("feapro:open-import-wizard", {
        detail: source ? { source } : undefined,
      }),
    );
  };

  return (
    <div className="p-3 space-y-3">
      <Card
        title="Importa modello"
        description="Wizard a 4 step (Fonte → File → Anteprima → Conferma)."
      >
        <div className="space-y-2.5">
          <div className="bg-bg-panel border border-border rounded-md p-3.5 flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-bg-info text-accent flex items-center justify-center flex-shrink-0">
              <FileUp className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-ink">Apri wizard import</div>
              <p className="text-[11px] text-ink-3 leading-snug mt-0.5">
                Supporta DXF (CAD), IFC4 (BIM), JSON nativo FEA Pro. Drag&drop
                + preview con summary nodi/elementi/warnings.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="primary"
              size="md"
              onClick={() => openWizard()}
              iconRight={<ChevronRight className="h-3.5 w-3.5" />}
              data-testid="import-open-wizard"
            >
              Apri wizard…
            </Button>
            <Button
              variant="secondary"
              size="md"
              onClick={() => openWizard("dxf")}
            >
              Solo DXF
            </Button>
          </div>

          <p className="text-[10px] text-ink-3 leading-snug">
            Tip: puoi anche trascinare un file JSON direttamente nel viewport
            (drag&drop globale) o usare <kbd className="kbd">Ctrl+K</kbd> →
            <span className="font-semibold"> "import"</span>.
          </p>
        </div>
      </Card>
    </div>
  );
}
