/**
 * PercorsoFullScreenDemo (Precision v2.0 PR15 T8).
 *
 * Wrapper che usa `PercorsoStep` (template full-screen Claude Design) per
 * presentare il 6-step pieno C2-C7 come overlay sopra l'app. Si attiva via
 * custom event `feapro:open-percorso-fullscreen`.
 *
 * Funziona come "preview navigabile" del flow Percorsi finale: serve a
 * dimostrare il template C2-C7 senza dover ancora costruire route + form
 * reali per ogni step. Quando arriveranno i form veri (sprint future),
 * questo componente si svuota.
 *
 * Dismiss: tasto ESC + bottone "Esci dal percorso" in header.
 */
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { PercorsoStep } from "./PercorsoStep";
import { PERCORSO_STEPS_6 } from "./PercorsoStepper";
import { IconButton } from "../ui";

const STEP_DEMO_CONTENT: Record<number, {
  title: string;
  subtitle: string;
  help: React.ReactNode;
  body: React.ReactNode;
  validation: { status: "ok" | "warn" | "error" | "pending"; message: string };
}> = {
  1: {
    title: "Definisci la geometria",
    subtitle: "Aggiungi nodi ed elementi al modello. Punto di partenza per ogni analisi strutturale.",
    help: (
      <>
        <p>La geometria definisce <strong className="text-ink">cosa</strong> analizziamo.</p>
        <p>Nodi = punti nello spazio. Elementi = membri strutturali che li collegano (beam, shell, solid).</p>
        <p>Suggerimento: parti da un template tra i 9 didattici se non hai una geometria propria.</p>
      </>
    ),
    body: (
      <div className="space-y-4">
        <p className="text-md text-ink-2 leading-relaxed max-w-[64ch]">
          Demo: questo step in produzione mostrerà il form di import / table editor / drag-and-drop dei nodi.
        </p>
        <div className="bg-bg-panel border border-border p-4">
          <div className="font-mono text-[10px] uppercase tracking-wide-3 text-ink-3 mb-2">Anteprima</div>
          <div className="text-base text-ink">11 nodi · 10 elementi · 2D</div>
        </div>
      </div>
    ),
    validation: { status: "ok", message: "Geometria definita" },
  },
  2: {
    title: "Vincoli e carichi",
    subtitle: "Specifica come il modello è ancorato e che forze riceve.",
    help: (
      <>
        <p>Vincoli (boundary conditions) = come la struttura è ancorata al terreno o ad altre strutture.</p>
        <p>Carichi = forze esterne (gravità, neve, vento, sisma, carichi specifici).</p>
      </>
    ),
    body: <p className="text-md text-ink-2">Demo: form vincoli + lista carichi applicati.</p>,
    validation: { status: "ok", message: "2 vincoli, 1 carico" },
  },
  3: {
    title: "Materiali e sezioni",
    subtitle: "Definisci proprietà fisiche e dimensionali degli elementi.",
    help: <p>Materiale + sezione determinano la <strong className="text-ink">rigidezza</strong> di ogni elemento (EI, EA, GJ).</p>,
    body: <p className="text-md text-ink-2">Demo: SectionPicker + MaterialPicker live.</p>,
    validation: { status: "ok", message: "Acciaio S275 · IPE160" },
  },
  4: {
    title: "Esegui l'analisi",
    subtitle: "Lancia il solver. Algoritmo deterministico, niente AI, ogni passaggio tracciabile.",
    help: <p>Preview: 12 DOF · 23 ms solve time · 0 crediti consumati (analisi statica gratuita).</p>,
    body: <p className="text-md text-ink-2">Demo: bottone Esegui + CostPreviewCard inline.</p>,
    validation: { status: "pending", message: "Pronto a lanciare" },
  },
  5: {
    title: "Punti critici",
    subtitle: "Esamina gli elementi con UC più alto.",
    help: <p>UC = utilization coefficient. Se &gt; 1 l&apos;elemento è sottodimensionato.</p>,
    body: <p className="text-md text-ink-2">Demo: InsightPanel + viewport zoom su critical.</p>,
    validation: { status: "warn", message: "1 elemento UC > 0.85" },
  },
  6: {
    title: "Genera report",
    subtitle: "Esporta PDF firmabile dal tecnico abilitato. Sempre DRAFT finché non firmato.",
    help: <p>Il PDF include: cover + modello + risultati + criticità + conclusioni.</p>,
    body: <p className="text-md text-ink-2">Demo: ReportExportDialog con TrustLayerBadge banner.</p>,
    validation: { status: "ok", message: "Pronto per export" },
  },
};

export function PercorsoFullScreenDemo() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);

  useEffect(() => {
    function handleOpen() {
      setStep(1);
      setOpen(true);
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape" && open) setOpen(false);
    }
    window.addEventListener("feapro:open-percorso-fullscreen", handleOpen);
    window.addEventListener("keydown", handleEsc);
    return () => {
      window.removeEventListener("feapro:open-percorso-fullscreen", handleOpen);
      window.removeEventListener("keydown", handleEsc);
    };
  }, [open]);

  if (!open) return null;

  const content = STEP_DEMO_CONTENT[step] ?? STEP_DEMO_CONTENT[1];
  const isLast = step >= PERCORSO_STEPS_6.length;

  return (
    <div
      className="fixed inset-0 z-dialog bg-bg flex flex-col animate-fade-in"
      role="dialog"
      aria-label="Percorso guidato (demo)"
      data-testid="percorso-fullscreen-demo"
    >
      {/* Close bar */}
      <div className="flex items-center justify-between border-b border-border bg-bg-panel px-4 py-2">
        <div className="font-mono text-[10px] uppercase tracking-wide-3 text-ink-3">
          Demo Percorso · Anteprima C2-C7
        </div>
        <IconButton
          aria-label="Esci dal percorso"
          variant="ghost"
          onClick={() => setOpen(false)}
          data-testid="percorso-fullscreen-close"
        >
          <X className="w-4 h-4" />
        </IconButton>
      </div>

      {/* PercorsoStep template */}
      <div className="flex-1 overflow-hidden">
        <PercorsoStep
          step={step}
          title={content.title}
          subtitle={content.subtitle}
          help={content.help}
          validation={content.validation}
          onBack={step > 1 ? () => setStep(step - 1) : undefined}
          onForward={!isLast ? () => setStep(step + 1) : () => setOpen(false)}
          forwardLabel={isLast ? "Concludi" : "Avanti"}
          onStepClick={(s) => setStep(s)}
        >
          {content.body}
        </PercorsoStep>
      </div>
    </div>
  );
}
