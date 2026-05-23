/**
 * PercorsiBeamWizard (v1.9.0 T1 · v2.2.0 audit-fix B7 6-step) — Demo Slice
 * GPS Strutturale completo end-to-end.
 *
 * Prima del fix B7 il wizard si fermava allo step 3 ("Carica modello e
 * analizza") e poi chiudeva, lasciando l'utente nel viewport con il modello
 * caricato — ma il flow "Percorso guidato" 6-step mostrato a preview non era
 * realmente percorribile interno al wizard.
 *
 * v2.2.0 B7: ora il wizard ha 6 step **funzionali** allineati al
 * `PercorsoStepper` canonico:
 *
 *   1. Geometria         → scegli percorso (3 card preset)
 *   2. Vincoli/Carichi   → riepilogo configurazione + nota didattica
 *   3. Materiali/Sezioni → conferma e carica template attivo
 *   4. Esegui            → lancia analisi statica (live progress)
 *   5. Critical          → UC GPS Strutturale (S275/EC3/NTC) + verifica
 *   6. Report            → genera PDF + chiudi
 *
 * Dismiss: ESC / click-outside / swipe-back (no crocette, v1.7 T5 rule).
 */
import { useEffect, useState } from "react";
import {
  ChevronRight, ArrowLeft, Sparkles, Workflow, ShieldCheck,
  Play, Check, AlertTriangle, FileText, Loader2, type LucideIcon,
} from "lucide-react";

import { useModalBackButton } from "../../hooks/useModalBackButton";
import { useRunAnalysis } from "../../hooks/useAnalysis";
import { useAnalysisStore } from "../../store/analysisStore";
import { useResultsStore } from "../../store/resultsStore";
import { useModelStore } from "../../store/modelStore";
import { toneFromUc, GPS_FYD, type CheckTone } from "../../lib/gpsTrust";
import { PercorsoStepper, PERCORSO_STEPS_6 } from "../shell/PercorsoStepper";
import { Dialog } from "./Dialog";


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
  {
    id: "mensola-3d",
    templateId: "ex_3d_grid",
    Icon: ShieldCheck,
    title: "Reticolo 3D · griglia",
    description: "Struttura spaziale a griglia con carichi verticali distribuiti.",
    geometry: "16 nodi · 36 elementi · griglia 3×3 m",
    loads: "F = 20 kN verticale sui nodi top · vincoli al perimetro base",
    expectedOutcome: "Modello demo · iterativo per esplorare 3D",
  },
];


type Step = 1 | 2 | 3 | 4 | 5 | 6;


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

  return (
    <Dialog open={open} onClose={handleClose} title="Percorsi" width={620}>
      <div className="space-y-3" data-testid="percorsi-wizard">
        {/* Stepper canonical 6-step (sostituisce il chevron-list ad hoc) */}
        <PercorsoStepper
          steps={PERCORSO_STEPS_6}
          currentStep={step}
          compact
          className="border-b border-border bg-bg-panel px-3 py-2"
          onStepClick={(s) => {
            // Click su step done = navigation indietro consentita
            if (s < step) setStep(s as Step);
          }}
        />

        {/* STEP 1 — Geometria: scegli percorso */}
        {step === 1 && (
          <div className="space-y-2" data-testid="percorsi-step-1">
            <div className="text-[10px] uppercase tracking-wider text-ink-3 font-mono font-semibold">
              Scegli un percorso guidato
            </div>
            <div className="space-y-1.5">
              {PERCORSI.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handlePick(p)}
                  data-testid={`percorsi-card-${p.id}`}
                  className="w-full text-left flex items-start gap-2.5 p-3 border border-border hover:border-accent/40 hover:bg-accent-subtle/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
                >
                  <div className="w-8 h-8 bg-accent-subtle text-accent flex items-center justify-center flex-shrink-0">
                    <p.Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-ink">{p.title}</div>
                    <div className="text-[11px] text-ink-3 leading-snug mt-0.5">{p.description}</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-ink-3 flex-shrink-0 mt-1" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 2 — Vincoli / Carichi: riepilogo */}
        {step === 2 && selected && (
          <div className="space-y-3" data-testid="percorsi-step-2">
            <div className="text-[10px] uppercase tracking-wider text-ink-3 font-mono font-semibold">
              Vincoli e carichi del percorso
            </div>
            <div className="bg-accent-subtle/40 border border-accent/30 p-3 space-y-2">
              <div className="text-sm font-semibold text-ink">{selected.title}</div>
              <div className="grid grid-cols-[80px_1fr] gap-x-3 gap-y-1.5 text-[11px]">
                <span className="text-ink-3">Geometria</span>
                <span className="text-ink font-mono">{selected.geometry}</span>
                <span className="text-ink-3">Carichi</span>
                <span className="text-ink font-mono">{selected.loads}</span>
                <span className="text-ink-3">Atteso</span>
                <span className="text-accent font-mono">{selected.expectedOutcome}</span>
              </div>
            </div>
            <div className="text-[10px] text-ink-3 leading-snug">
              I valori sono didattici e basati su NTC 2018 §4.2 · S275. Per
              verifiche reali sostituisci la sezione e i carichi nel pannello
              Make dopo il caricamento.
            </div>
            <FooterNav onBack={() => setStep(1)} backLabel="Cambia percorso" onNext={() => setStep(3)} />
          </div>
        )}

        {/* STEP 3 — Materiali / Sezioni: conferma e carica */}
        {step === 3 && selected && (
          <div className="space-y-3" data-testid="percorsi-step-3">
            <div className="font-mono text-[10px] uppercase tracking-wide-3 text-ink-3 font-semibold">
              Pronto a caricare materiali e sezioni
            </div>
            <div className="bg-bg-success border border-success/30 p-3 text-[11px]">
              <div className="text-success font-semibold mb-1">
                Carico "{selected.title}" come modello attivo
              </div>
              <div className="text-ink leading-snug">
                Acciaio S275 + sezioni IPE/HEA preconfigurate. Il template
                arriva con materiali, sezioni e vincoli già impostati.
              </div>
            </div>
            <FooterNav
              onBack={() => setStep(2)}
              onNext={handleConfirmLoad}
              nextLabel="Carica e procedi →"
            />
          </div>
        )}

        {/* STEP 4 — Esegui: lancia analisi statica */}
        {step === 4 && selected && (
          <div className="space-y-3" data-testid="percorsi-step-4">
            <div className="font-mono text-[10px] uppercase tracking-wide-3 text-ink-3 font-semibold">
              Solver lineare statico
            </div>
            <div className={`border p-3 text-[11px] ${
              solverDone ? "bg-bg-success border-success/30" : "bg-bg-info border-accent/30"
            }`}>
              {isRunning && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-accent font-semibold">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    {progressMessage || "Esecuzione in corso…"}
                  </div>
                  <div className="h-1 bg-bg-hover overflow-hidden">
                    <div className="h-full bg-accent transition-all duration-mid" style={{ width: `${Math.round(progress * 100)}%` }} />
                  </div>
                  <div className="font-mono text-[10px] text-ink-3 tabular-nums">
                    {Math.round(progress * 100)} %
                  </div>
                </div>
              )}
              {!isRunning && !solverDone && (
                <div className="flex items-center gap-2 text-ink-2">
                  <Play className="w-3.5 h-3.5" />
                  In attesa del solver… (template caricato, premi avvio se non parte da solo)
                </div>
              )}
              {solverDone && staticResults && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-success font-semibold">
                    <Check className="w-3.5 h-3.5" />
                    Analisi completata
                  </div>
                  <div className="font-mono text-[11px] text-ink mt-1.5 space-y-0.5">
                    <div>max u = <span className="font-semibold">{(staticResults.max_displacement * 1000).toFixed(2)}</span> mm</div>
                    <div>max σ = <span className="font-semibold">{(staticResults.max_stress / 1e6).toFixed(1)}</span> MPa</div>
                  </div>
                </div>
              )}
            </div>
            <FooterNav
              onBack={() => setStep(3)}
              onNext={() => setStep(5)}
              nextDisabled={!solverDone}
              nextLabel="Vai a Critical →"
            />
          </div>
        )}

        {/* STEP 5 — Critical: UC GPS strutturale */}
        {step === 5 && (
          <div className="space-y-3" data-testid="percorsi-step-5">
            <div className="font-mono text-[10px] uppercase tracking-wide-3 text-ink-3 font-semibold">
              Verifiche GPS Strutturale
            </div>
            {checks.length === 0 ? (
              <div className="text-[11px] text-ink-3 italic px-2 py-3 bg-bg-panel border border-border">
                Nessun risultato disponibile. Torna allo step Esegui.
              </div>
            ) : (
              <div className="space-y-1.5">
                {checks.map((c) => (
                  <div
                    key={c.id}
                    className={`border p-2.5 flex items-center gap-3 ${
                      c.tone === "ok"
                        ? "bg-bg-success border-success/30"
                        : c.tone === "warn"
                        ? "bg-bg-warn border-warn/30"
                        : "bg-bg-danger border-coral/30"
                    }`}
                    data-testid={`percorsi-check-${c.id}`}
                  >
                    {c.tone === "ok" ? (
                      <Check className="w-4 h-4 text-success flex-shrink-0" />
                    ) : (
                      <AlertTriangle className={`w-4 h-4 flex-shrink-0 ${c.tone === "warn" ? "text-warn" : "text-coral"}`} />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-semibold text-ink">{c.label}</div>
                      <div className="text-[10px] text-ink-3 font-mono">{c.hint}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="font-mono text-[10px] text-ink-3">UC</div>
                      <div className={`font-mono font-semibold text-sm tabular-nums ${
                        c.tone === "ok" ? "text-success" : c.tone === "warn" ? "text-warn" : "text-coral"
                      }`}>
                        {c.ratio.toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="text-[10px] text-ink-3 italic">
              Hint visivo · non sostituisce verifica formale secondo EC/NTC.
            </div>
            <FooterNav
              onBack={() => setStep(4)}
              onNext={() => setStep(6)}
              nextLabel="Vai a Report →"
            />
          </div>
        )}

        {/* STEP 6 — Report: export PDF + done */}
        {step === 6 && (
          <div className="space-y-3" data-testid="percorsi-step-6">
            <div className="font-mono text-[10px] uppercase tracking-wide-3 text-ink-3 font-semibold">
              Report finale
            </div>
            <div className="bg-bg-success border border-success/30 p-3 text-[11px] space-y-1.5">
              <div className="text-success font-semibold flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" />
                Percorso completato
              </div>
              <div className="text-ink leading-snug">
                Hai caricato il template, lanciato la statica e verificato l'UC
                normativo. L'ultimo step è l'esportazione del PDF tracciabile.
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                handleClose();
                window.dispatchEvent(new Event("feapro:open-export-pdf"));
              }}
              data-testid="percorsi-open-report"
              className="w-full inline-flex items-center justify-center gap-2 bg-accent text-white px-3 py-2 text-sm font-semibold hover:bg-accent-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
            >
              <FileText className="w-4 h-4" />
              Apri ReportExportDialog
            </button>
            <FooterNav
              onBack={() => setStep(5)}
              onNext={handleClose}
              nextLabel="Chiudi · vai al modello"
            />
          </div>
        )}
      </div>
    </Dialog>
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


/** Footer navigation pulsanti coerente fra tutti gli step. */
function FooterNav({
  onBack,
  backLabel = "Indietro",
  onNext,
  nextLabel = "Avanti",
  nextDisabled = false,
}: {
  onBack: () => void;
  backLabel?: string;
  onNext: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
}) {
  return (
    <div className="flex gap-2 pt-1 border-t border-border">
      <button
        type="button"
        onClick={onBack}
        data-testid="percorsi-back"
        className="flex items-center gap-1 px-3 py-1.5 text-xs text-ink-3 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        {backLabel}
      </button>
      <div className="flex-1" />
      <button
        type="button"
        onClick={onNext}
        disabled={nextDisabled}
        data-testid="percorsi-next"
        className="px-3 py-1.5 bg-accent text-white text-xs font-medium hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
      >
        {nextLabel}
      </button>
    </div>
  );
}
