/**
 * PercorsiBeamWizard (v1.9.0 T1 · v2.2.0 audit-fix B7 6-step · v2.6.3.1 T3) —
 * Demo Slice GPS Strutturale completo end-to-end.
 *
 * v2.6.3.1 BUG-#2 fix: il wizard era un `<Dialog>` modale 620×~600px. Il
 * pattern handoff `PercorsoStep` template (eyebrow + h2 + subtitle + aside
 * "Perché te lo chiediamo" + footer validation+nav) richiede area
 * workspace piena (`flex flex-col h-full`). Refactor a full-page overlay
 * mirando lo stesso pattern di `PercorsoFullScreenDemo.tsx` già live.
 *
 * 6 step funzionali allineati al `PercorsoStepper` canonico:
 *   1. Geometria         → scegli percorso (3 card preset)
 *   2. Vincoli/Carichi   → riepilogo configurazione + nota didattica
 *   3. Materiali/Sezioni → conferma e carica template attivo
 *   4. Esegui            → lancia analisi statica (live progress)
 *   5. Critical          → UC GPS Strutturale (S275/EC3/NTC)
 *   6. Report            → genera PDF + chiudi
 *
 * Step 1 = selettore percorso (hub di scelta, NON wrappato in PercorsoStep).
 * Step 2-6 = body interni wrappati in `<PercorsoStep>` template handoff
 * (eyebrow STEP N/6 · TITLE, h2 display, subtitle, help aside 280px,
 * validation chip footer + nav).
 *
 * Dismiss: ESC / button close in top close bar (no crocette tradizionali).
 */
import { useEffect, useState, type ReactNode } from "react";
import {
  ChevronRight, X, Sparkles, Workflow, ShieldCheck,
  Play, Check, AlertTriangle, FileText, Loader2, type LucideIcon,
} from "lucide-react";

import { useModalBackButton } from "../../hooks/useModalBackButton";
import { useRunAnalysis } from "../../hooks/useAnalysis";
import { useAnalysisStore } from "../../store/analysisStore";
import { useResultsStore } from "../../store/resultsStore";
import { useModelStore } from "../../store/modelStore";
import { toneFromUc, GPS_FYD, type CheckTone } from "../../lib/gpsTrust";
import { PercorsoStep } from "../shell/PercorsoStep";
import { IconButton } from "../ui";


interface Props {
  open: boolean;
  onClose: () => void;
  /** Chiamato quando l'utente conferma — carica il template scelto. */
  onLoadTemplate: (templateId: string) => void;
}

interface BeamPercorso {
  id: string;
  /** id template backend (es. ex_simple_beam_2d). */
  templateId: string;
  Icon: LucideIcon;
  title: string;
  description: string;
  geometry: string;
  loads: string;
  expectedOutcome: string;
}

const PERCORSI: BeamPercorso[] = [
  {
    id: "trave-bi-appoggiata-uc1",
    templateId: "ex_simple_beam_2d",
    Icon: Workflow,
    title: "Trave bi-appoggiata · UC1",
    description: "Verifica utilization coefficient (S275) su trave 4m con carico uniforme.",
    geometry: "L = 4 m · IPE160 · 2 nodi · 1 elemento beam",
    loads: "q = 10 kN/m distribuito · 2 vincoli (pin + roller)",
    expectedOutcome: "Max σ ≈ 89 MPa · UC ≈ 0.32 (S275 = 275 MPa)",
  },
  {
    id: "telaio-portale-2d",
    templateId: "ex_portal_frame_2d",
    Icon: Sparkles,
    title: "Telaio portale · 2D",
    description: "Telaio 5×3 m con carico orizzontale, deformazione a coda d'aquila.",
    geometry: "5×3 m · 5 nodi · 4 elementi · pilastri + traverso",
    loads: "H = 5 kN orizzontale top · 2 incastri alla base",
    expectedOutcome: "Max u ≈ 12 mm orizzontale · taglio max 8 kN",
  },
  // v3.5 GAL-fix (30/05/2026): id "mensola-3d" + templateId "ex_3d_grid"
  // erano fantasma (404 backend). Sostituito con ex_truss_3d reale.
  {
    id: "reticolare-3d",
    templateId: "ex_truss_3d",
    Icon: ShieldCheck,
    title: "Reticolare spaziale · 3D",
    description: "Torre reticolare a 4 livelli, ø100mm, carichi nodali al top.",
    geometry: "Torre 4 livelli · ø100mm · ~16 nodi",
    loads: "F nodale verticale al top · base incastrata",
    expectedOutcome: "Aste in compressione e trazione · primo modello 3D",
  },
];


type Step = 1 | 2 | 3 | 4 | 5 | 6;

// v2.6.3.1 T3: contenuti per il template PercorsoStep handoff.
// `title`/`subtitle` finiscono nell'header (h2 display + text-md ink-2).
// `help` ReactNode finisce nell'aside 280px "Perché te lo chiediamo".
const STEP_TITLES: Record<Exclude<Step, 1>, string> = {
  2: "Vincoli e carichi del percorso",
  3: "Carica materiali e sezioni del template",
  4: "Esegui l'analisi statica",
  5: "Verifiche GPS Strutturale (S275 · EC3 · NTC)",
  6: "Genera il report PDF",
};

const STEP_SUBTITLES: Record<Exclude<Step, 1>, string> = {
  2: "Il template che hai scelto preset vincoli e carichi. Conferma per procedere.",
  3: "Il modello arriva con materiale S275 e sezione standard già configurati.",
  4: "Solver lineare statico — deterministico, tracciabile, gratuito (no crediti).",
  5: "UC = σ_max / fyd. Se UC > 1 l'elemento è sottodimensionato.",
  6: "Esporta PDF tracciabile. Sempre marcato DRAFT finché non firmato da tecnico abilitato.",
};

const STEP_HELP: Record<Exclude<Step, 1>, ReactNode> = {
  2: (
    <>
      <p>
        <strong className="text-ink">Vincoli</strong> (boundary conditions) = come la struttura
        è ancorata al terreno o ad altre strutture.
      </p>
      <p>
        <strong className="text-ink">Carichi</strong> = forze esterne applicate (peso, neve,
        vento, sisma, carichi specifici).
      </p>
      <p>
        Il percorso scelto preset entrambi su valori didattici (NTC 2018 §4.2 · S275)
        così puoi concentrarti sul flow end-to-end.
      </p>
    </>
  ),
  3: (
    <>
      <p>
        <strong className="text-ink">Materiale + sezione</strong> determinano la
        rigidezza di ogni elemento (EI, EA, GJ).
      </p>
      <p>
        Il template arriva con acciaio S275 e sezioni IPE/HEA preconfigurate. Dopo il
        caricamento potrai sostituirli nel pannello Make.
      </p>
    </>
  ),
  4: (
    <>
      <p>
        Il solver lineare statico assume <strong className="text-ink">materiale elastico
        lineare</strong> e <strong className="text-ink">piccoli spostamenti</strong>.
      </p>
      <p>
        Algoritmo deterministico, ogni passaggio è tracciabile. Spostamenti e tensioni
        sono calcolati in ~10-50 ms per modelli didattici.
      </p>
    </>
  ),
  5: (
    <>
      <p>
        <strong className="text-ink">UC</strong> = utilization coefficient = σ_max / fyd.
      </p>
      <p>
        I 3 check (S275 / EC3 §6.2.1 / NTC18 §4.2.4.1) verificano lo stesso σ_max
        contro riferimenti normativi diversi. UC ≥ 1 = elemento da rivedere.
      </p>
      <p className="text-ink-3 italic">Hint visivo · non sostituisce verifica formale.</p>
    </>
  ),
  6: (
    <>
      <p>
        Il PDF include <strong className="text-ink">cover + modello + risultati + criticità
        + conclusioni</strong>.
      </p>
      <p>
        Trust Layer: il report è <strong className="text-ink">sempre DRAFT</strong> finché un
        tecnico abilitato non lo firma. Acquisisce validità professionale solo con firma.
      </p>
    </>
  ),
};


export function PercorsiBeamWizard({ open, onClose, onLoadTemplate }: Props) {
  useModalBackButton(open, onClose);
  const [step, setStep] = useState<Step>(1);
  const [selected, setSelected] = useState<BeamPercorso | null>(null);
  const [solveStarted, setSolveStarted] = useState(false);

  const run = useRunAnalysis();
  const isRunning = useAnalysisStore((s) => s.isRunning);
  const progress = useAnalysisStore((s) => s.progress);
  const progressMessage = useAnalysisStore((s) => s.progressMessage);
  const staticResults = useResultsStore((s) => s.staticResults);
  const model = useModelStore((s) => s.model);

  function reset() {
    setStep(1);
    setSelected(null);
    setSolveStarted(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handlePick(p: BeamPercorso) {
    setSelected(p);
    setStep(2);
  }

  // Step 3 → caricamento template + transizione a step 4 (Esegui)
  function handleConfirmLoad() {
    if (!selected) return;
    onLoadTemplate(selected.templateId);
    setStep(4);
  }

  // Step 4: avvio analisi statica una sola volta quando il template è caricato.
  // useEffect attende che il modello attivo cambi (popolato da App.tsx) e poi
  // chiama run() automaticamente.
  useEffect(() => {
    if (step !== 4 || solveStarted) return;
    if (!model) return;
    setSolveStarted(true);
    void run();
  }, [step, solveStarted, model, run]);

  // Quando i risultati arrivano, abilito il "Avanti" verso Critical.
  const solverDone = !!staticResults && !isRunning;

  // Critical: 3 verifiche GPS Strutturale derivate live (vedi VerifyChecksLive).
  const checks = staticResults && model ? computeGpsChecks(staticResults.max_stress) : [];

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-dialog bg-bg flex flex-col animate-fade-in"
      role="dialog"
      aria-label="Percorsi guidati GPS Strutturale"
      data-testid="percorsi-wizard"
    >
      {/* Top close bar */}
      <div className="flex items-center justify-between border-b border-border bg-bg-panel px-4 py-2 flex-shrink-0">
        <div className="font-mono text-[10px] uppercase tracking-wide-3 text-ink-3">
          Percorsi guidati · GPS Strutturale
        </div>
        <IconButton
          aria-label="Chiudi"
          variant="ghost"
          onClick={handleClose}
          data-testid="percorsi-wizard-close"
        >
          <X className="w-4 h-4" />
        </IconButton>
      </div>

      {step === 1 ? (
        // STEP 1 — Selettore percorso (hub iniziale, NON wrappato in PercorsoStep
        // perché è una scelta di partenza, non un step "in flow").
        <div className="flex-1 overflow-y-auto" data-testid="percorsi-step-1">
          <div className="max-w-3xl mx-auto px-6 py-10">
            <div className="font-mono text-[10px] uppercase tracking-wide-4 text-ink-3 mb-2">
              Step 1 / 6 · Geometria
            </div>
            <h1 className="font-display text-2xl font-semibold tracking-tight-2 text-ink leading-tight mb-2">
              Scegli un percorso guidato
            </h1>
            <p className="text-md text-ink-2 leading-relaxed max-w-[64ch] mb-6">
              I 3 percorsi qui sotto sono demo end-to-end didattiche: ogni percorso
              precarica geometria, vincoli, carichi e materiali, così puoi vedere
              il flow GPS Strutturale completo dal click al PDF in &lt; 1 minuto.
            </p>
            <div className="space-y-2">
              {PERCORSI.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handlePick(p)}
                  data-testid={`percorsi-card-${p.id}`}
                  className="w-full text-left flex items-start gap-3 p-4 border border-border hover:border-accent/40 hover:bg-accent-subtle/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
                >
                  <div className="w-10 h-10 bg-accent-subtle text-accent flex items-center justify-center flex-shrink-0">
                    <p.Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-display text-lg font-semibold tracking-tight-1 text-ink">{p.title}</div>
                    <div className="text-md text-ink-2 leading-snug mt-1">{p.description}</div>
                    <div className="font-mono text-[10px] text-ink-3 mt-2">
                      {p.geometry} · {p.loads}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-ink-3 flex-shrink-0 mt-2" />
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        // STEP 2-6 — Wrapped in PercorsoStep template (eyebrow + h2 + subtitle +
        // help aside + footer validation+nav)
        <div className="flex-1 overflow-hidden">
          <PercorsoStep
            step={step}
            title={STEP_TITLES[step]}
            subtitle={STEP_SUBTITLES[step]}
            help={STEP_HELP[step]}
            validation={getValidation(step, selected, solverDone, isRunning, checks)}
            onBack={() => setStep((step - 1) as Step)}
            onForward={
              step === 3
                ? handleConfirmLoad
                : step === 6
                ? handleClose
                : () => setStep((step + 1) as Step)
            }
            forwardDisabled={!isForwardEnabled(step, selected, solverDone)}
            forwardLabel={
              step === 3
                ? "Carica e procedi →"
                : step === 4
                ? "Vai a Critical →"
                : step === 5
                ? "Vai a Report →"
                : step === 6
                ? "Chiudi · vai al modello"
                : undefined
            }
            onStepClick={(s) => {
              // Navigation indietro consentita
              if (s < step) setStep(s as Step);
            }}
          >
            {step === 2 && selected && (
              <Step2Body selected={selected} data-testid="percorsi-step-2" />
            )}
            {step === 3 && selected && (
              <Step3Body selected={selected} data-testid="percorsi-step-3" />
            )}
            {step === 4 && selected && (
              <Step4Body
                solverDone={solverDone}
                isRunning={isRunning}
                progress={progress}
                progressMessage={progressMessage}
                staticResults={staticResults}
                data-testid="percorsi-step-4"
              />
            )}
            {step === 5 && (
              <Step5Body checks={checks} data-testid="percorsi-step-5" />
            )}
            {step === 6 && (
              <Step6Body
                onOpenReport={() => {
                  handleClose();
                  window.dispatchEvent(new Event("feapro:open-export-pdf"));
                }}
                data-testid="percorsi-step-6"
              />
            )}
          </PercorsoStep>
        </div>
      )}
    </div>
  );
}


// ── Step bodies ────────────────────────────────────────────────────────────

function Step2Body({ selected }: { selected: BeamPercorso }) {
  return (
    <div className="space-y-4" data-testid="percorsi-step-2">
      <div className="bg-accent-subtle/40 border border-accent/30 p-4 space-y-3 max-w-2xl">
        <div className="font-display text-lg font-semibold tracking-tight-1 text-ink">{selected.title}</div>
        <div className="grid grid-cols-[100px_1fr] gap-x-3 gap-y-1.5 text-base">
          <span className="text-ink-3">Geometria</span>
          <span className="text-ink font-mono">{selected.geometry}</span>
          <span className="text-ink-3">Carichi</span>
          <span className="text-ink font-mono">{selected.loads}</span>
          <span className="text-ink-3">Atteso</span>
          <span className="text-accent font-mono">{selected.expectedOutcome}</span>
        </div>
      </div>
      <div className="text-md text-ink-3 leading-relaxed max-w-[64ch]">
        I valori sono didattici e basati su NTC 2018 §4.2 · S275. Per verifiche
        reali sostituisci la sezione e i carichi nel pannello Make dopo il
        caricamento del template.
      </div>
    </div>
  );
}

function Step3Body({ selected }: { selected: BeamPercorso }) {
  return (
    <div className="space-y-4" data-testid="percorsi-step-3">
      <div className="bg-bg-success border border-success/30 p-4 max-w-2xl">
        <div className="font-display text-lg text-success font-semibold tracking-tight-1 mb-2">
          Carico &quot;{selected.title}&quot; come modello attivo
        </div>
        <div className="text-md text-ink leading-relaxed">
          Acciaio <span className="font-mono font-semibold">S275</span> + sezioni
          IPE/HEA preconfigurate. Il template arriva con materiali, sezioni e
          vincoli già impostati.
        </div>
      </div>
    </div>
  );
}

function Step4Body({
  solverDone,
  isRunning,
  progress,
  progressMessage,
  staticResults,
}: {
  solverDone: boolean;
  isRunning: boolean;
  progress: number;
  progressMessage: string;
  staticResults: ReturnType<typeof useResultsStore.getState>["staticResults"];
}) {
  return (
    <div className="space-y-4 max-w-2xl" data-testid="percorsi-step-4">
      <div className={`border p-4 ${
        solverDone ? "bg-bg-success border-success/30" : "bg-bg-info border-accent/30"
      }`}>
        {isRunning && (
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-accent font-semibold">
              <Loader2 className="w-4 h-4 animate-spin" />
              {progressMessage || "Esecuzione in corso…"}
            </div>
            <div className="h-1.5 bg-bg-hover overflow-hidden">
              <div className="h-full bg-accent transition-all duration-mid" style={{ width: `${Math.round(progress * 100)}%` }} />
            </div>
            <div className="font-mono text-[10px] text-ink-3 tabular-nums">
              {Math.round(progress * 100)} %
            </div>
          </div>
        )}
        {!isRunning && !solverDone && (
          <div className="flex items-center gap-2 text-ink-2">
            <Play className="w-4 h-4" />
            In attesa del solver… (template caricato, attendi pochi secondi)
          </div>
        )}
        {solverDone && staticResults && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-success font-semibold">
              <Check className="w-4 h-4" />
              Analisi completata
            </div>
            <div className="font-mono text-md text-ink space-y-0.5">
              <div>max u = <span className="font-semibold">{(staticResults.max_displacement * 1000).toFixed(2)}</span> mm</div>
              <div>max σ = <span className="font-semibold">{(staticResults.max_stress / 1e6).toFixed(1)}</span> MPa</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Step5Body({ checks }: { checks: PercorsoCheck[] }) {
  return (
    <div className="space-y-3 max-w-3xl" data-testid="percorsi-step-5">
      {checks.length === 0 ? (
        <div className="text-md text-ink-3 italic px-4 py-6 bg-bg-panel border border-border">
          Nessun risultato disponibile. Torna allo step Esegui.
        </div>
      ) : (
        <div className="space-y-2">
          {checks.map((c) => (
            <div
              key={c.id}
              className={`border p-3 flex items-center gap-3 ${
                c.tone === "ok"
                  ? "bg-bg-success border-success/30"
                  : c.tone === "warn"
                  ? "bg-bg-warn border-warn/30"
                  : "bg-bg-danger border-coral/30"
              }`}
              data-testid={`percorsi-check-${c.id}`}
            >
              {c.tone === "ok" ? (
                <Check className="w-5 h-5 text-success flex-shrink-0" />
              ) : (
                <AlertTriangle className={`w-5 h-5 flex-shrink-0 ${c.tone === "warn" ? "text-warn" : "text-coral"}`} />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-md font-semibold text-ink">{c.label}</div>
                <div className="text-base text-ink-3 font-mono mt-0.5">{c.hint}</div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="font-mono text-[10px] text-ink-3">UC</div>
                <div className={`font-mono font-semibold text-xl tabular-nums ${
                  c.tone === "ok" ? "text-success" : c.tone === "warn" ? "text-warn" : "text-coral"
                }`}>
                  {c.ratio.toFixed(2)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Step6Body({ onOpenReport }: { onOpenReport: () => void }) {
  return (
    <div className="space-y-4 max-w-2xl" data-testid="percorsi-step-6">
      <div className="bg-bg-success border border-success/30 p-4 space-y-2">
        <div className="text-success font-semibold font-display text-lg tracking-tight-1 flex items-center gap-2">
          <Check className="w-5 h-5" />
          Percorso completato
        </div>
        <div className="text-md text-ink leading-relaxed">
          Hai caricato il template, lanciato la statica e verificato l'UC normativo.
          L'ultimo step è l'esportazione del PDF tracciabile (Trust Layer DRAFT
          finché un tecnico abilitato non firma).
        </div>
      </div>
      <button
        type="button"
        onClick={onOpenReport}
        data-testid="percorsi-open-report"
        className="inline-flex items-center justify-center gap-2 bg-accent text-white px-4 py-2.5 text-base font-semibold hover:bg-accent-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
      >
        <FileText className="w-4 h-4" />
        Apri Export Report PDF
      </button>
    </div>
  );
}


// ── Helpers ────────────────────────────────────────────────────────────────

interface PercorsoCheck {
  id: string;
  label: string;
  hint: string;
  ratio: number;
  tone: CheckTone;
}

function computeGpsChecks(maxStressPa: number): PercorsoCheck[] {
  const sigmaMPa = maxStressPa / 1e6;
  const specs: Array<Pick<PercorsoCheck, "id" | "label" | "hint"> & { fyd: number }> = [
    { id: "s275", label: "S275 · UC tensionale", hint: "fy = 275 MPa (S275, fyd ≈ 261 MPa con γM0 = 1.05)", fyd: GPS_FYD.s275 },
    { id: "ec3",  label: "EC3 · §6.2.1 base",     hint: "EN 1993-1-1 — resistenza base S235",                fyd: GPS_FYD.ec3 },
    { id: "ntc",  label: "NTC 2018 · §4.2.4.1",   hint: "S275 con γM0 = 1.05",                                fyd: GPS_FYD.ntc },
  ];
  return specs.map((s) => {
    const ratio = sigmaMPa / s.fyd;
    return { id: s.id, label: s.label, hint: s.hint, ratio, tone: toneFromUc(ratio) };
  });
}

/**
 * Validation status passato a PercorsoStep footer (chip ok/warn/error/pending).
 */
function getValidation(
  step: Step,
  selected: BeamPercorso | null,
  solverDone: boolean,
  isRunning: boolean,
  checks: PercorsoCheck[],
): { status: "ok" | "warn" | "error" | "pending"; message: string } | undefined {
  if (step === 1) return undefined;
  if (step === 2) {
    return selected
      ? { status: "ok", message: `Percorso selezionato: ${selected.title}` }
      : { status: "pending", message: "Scegli un percorso al passo precedente" };
  }
  if (step === 3) {
    return { status: "ok", message: "Template pronto da caricare" };
  }
  if (step === 4) {
    if (isRunning) return { status: "pending", message: "Solver in corso…" };
    if (solverDone) return { status: "ok", message: "Analisi completata" };
    return { status: "pending", message: "Attendo il solver" };
  }
  if (step === 5) {
    if (checks.length === 0) return { status: "pending", message: "Nessun risultato disponibile" };
    const worstTone = checks.reduce<CheckTone>(
      (worst, c) =>
        c.tone === "critical" ? "critical" : worst === "critical" ? "critical" : c.tone === "warn" ? "warn" : worst,
      "ok",
    );
    if (worstTone === "critical") return { status: "error", message: "Almeno una verifica fallita (UC ≥ 1)" };
    if (worstTone === "warn") return { status: "warn", message: "Margine sicurezza ridotto (UC ≥ 0.85)" };
    return { status: "ok", message: "Tutte le verifiche soddisfatte" };
  }
  if (step === 6) {
    return { status: "ok", message: "Pronto per export PDF" };
  }
  return undefined;
}

function isForwardEnabled(step: Step, selected: BeamPercorso | null, solverDone: boolean): boolean {
  if (step === 2) return !!selected;
  if (step === 3) return !!selected;
  if (step === 4) return solverDone;
  return true;
}
