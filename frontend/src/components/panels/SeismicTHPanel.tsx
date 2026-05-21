/**
 * SeismicTHPanel (v1.5 Task 31).
 *
 * UI sostituita dal SismicaTHWizard 3-step (Direzioni → Accelerogrammi →
 * Parametri). Il panel ora mostra solo un summary + bottone "Configura
 * analisi" che apre il wizard modale.
 *
 * Tutta la logica solver (buildSolveParams, useJobRun, useCostPreview)
 * vive ora dentro il wizard. Vedi `components/dialogs/wizards/SismicaTHWizard.tsx`.
 *
 * Pre-v1.5: form denso unico con AxisRow per X/Y/Z + 5 NumericInput di
 * parametri solver + bottone "Esegui TH". Disaccoppiamento parziale dalla
 * vista per facilitare future iterazioni della UX wizard senza toccare il
 * panel container.
 */
import { useState } from "react";
import { Zap, ChevronRight } from "lucide-react";
import { useModelStore } from "../../store/modelStore";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { SismicaTHWizard } from "../dialogs/wizards/SismicaTHWizard";


export function SeismicTHPanel() {
  const model = useModelStore((s) => s.model);
  const [wizardOpen, setWizardOpen] = useState(false);

  return (
    <div className="p-3 space-y-3">
      <Card
        title="Sismica time-history multi-componente (NTC §3.2.3.6)"
        description="Newmark-β su modello 3D con uno o più accelerogrammi GROUND_ACCEL ortogonali. Smorzamento Rayleigh tra due frequenze."
      >
        <div className="space-y-3">
          {/* Empty state: l'utente deve configurare prima di eseguire */}
          <div className="bg-bg-panel border border-border rounded-md p-3.5 flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-bg-info text-ink-info flex items-center justify-center flex-shrink-0">
              <Zap className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-ink">Configura sismica time-history</div>
              <p className="text-[11px] text-ink-muted leading-snug mt-0.5">
                Wizard a 3 step: scegli direzioni X/Y/Z, accelerogrammi
                (catalogo o sintetici), parametri solver Newmark-β.
              </p>
            </div>
          </div>

          <Button
            variant="primary"
            size="md"
            disabled={!model}
            onClick={() => setWizardOpen(true)}
            iconRight={<ChevronRight className="h-3.5 w-3.5" />}
            data-testid="seismic-th-open-wizard"
          >
            Configura analisi…
          </Button>

          {!model && (
            <p className="text-[11px] text-ink-dim italic">
              Richiede un modello caricato.
            </p>
          )}
        </div>
      </Card>

      <SismicaTHWizard open={wizardOpen} onClose={() => setWizardOpen(false)} />
    </div>
  );
}
