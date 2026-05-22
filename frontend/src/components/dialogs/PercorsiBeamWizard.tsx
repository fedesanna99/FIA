/**
 * PercorsiBeamWizard (v1.9.0 T1) — Demo Slice GPS Strutturale.
 *
 * Sostituisce il PercorsiPlaceholderDialog (v1.8 T2) con un VERO wizard
 * 3-step che porta l'utente da CTA "Percorsi" a un modello pre-popolato
 * + analisi statica eseguita.
 *
 * 3 step (NO crocette modal, dismiss ESC/backdrop/swipe-back):
 *   1. Scegli percorso — 3 card pre-set
 *   2. Riepilogo configurazione — preview parametri + nota didattica
 *   3. Conferma & carica — bottone "Carica modello e analizza"
 *
 * Implementazione minimal: non popola nuovi modelli, usa i template
 * gia' esistenti nel backend (id "ex_*"). User clicca confirm →
 * dispatch `feapro:load-template` con id template scelto.
 *
 * Coerente con la regola UI v1.7 T5 "no crocette": dismiss via ESC /
 * click-outside / swipe-back (vedi MobilePanel T2 v1.8.5).
 */
import { useState } from "react";
import { Dialog } from "./Dialog";
import { useModalBackButton } from "../../hooks/useModalBackButton";
import { ChevronRight, ArrowLeft, Sparkles, Workflow, ShieldCheck, type LucideIcon } from "lucide-react";

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

export function PercorsiBeamWizard({ open, onClose, onLoadTemplate }: Props) {
  useModalBackButton(open, onClose);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selected, setSelected] = useState<BeamPercorso | null>(null);

  function reset() {
    setStep(1);
    setSelected(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handlePick(p: BeamPercorso) {
    setSelected(p);
    setStep(2);
  }

  function handleConfirm() {
    if (!selected) return;
    onLoadTemplate(selected.templateId);
    handleClose();
  }

  return (
    <Dialog open={open} onClose={handleClose} title="Percorsi" width={560}>
      <div className="space-y-3" data-testid="percorsi-wizard">
        {/* Step indicator */}
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-mono text-ink-muted">
          <span className={step >= 1 ? "text-ink-percorsi font-semibold" : ""}>1. Scegli</span>
          <ChevronRight className="w-3 h-3" />
          <span className={step >= 2 ? "text-ink-percorsi font-semibold" : ""}>2. Riepilogo</span>
          <ChevronRight className="w-3 h-3" />
          <span className={step >= 3 ? "text-ink-percorsi font-semibold" : ""}>3. Conferma</span>
        </div>

        {/* STEP 1 — Scegli percorso */}
        {step === 1 && (
          <div className="space-y-2" data-testid="percorsi-step-1">
            <div className="text-[10px] uppercase tracking-wider text-ink-muted font-mono font-semibold">
              Scegli un percorso guidato
            </div>
            <div className="space-y-1.5">
              {PERCORSI.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handlePick(p)}
                  data-testid={`percorsi-card-${p.id}`}
                  className="w-full text-left flex items-start gap-2.5 p-3 border border-border rounded-md hover:border-percorsi/40 hover:bg-bg-percorsi/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-percorsi/60"
                >
                  <div className="w-8 h-8 rounded-md bg-bg-percorsi text-ink-percorsi flex items-center justify-center flex-shrink-0">
                    <p.Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-ink">{p.title}</div>
                    <div className="text-[11px] text-ink-muted leading-snug mt-0.5">{p.description}</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-ink-muted flex-shrink-0 mt-1" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 2 — Riepilogo */}
        {step === 2 && selected && (
          <div className="space-y-3" data-testid="percorsi-step-2">
            <div className="text-[10px] uppercase tracking-wider text-ink-muted font-mono font-semibold">
              Riepilogo configurazione
            </div>
            <div className="bg-bg-percorsi/40 border border-percorsi/30 rounded-md p-3 space-y-2">
              <div className="text-sm font-semibold text-ink">{selected.title}</div>
              <div className="grid grid-cols-[80px_1fr] gap-x-3 gap-y-1.5 text-[11px]">
                <span className="text-ink-muted">Geometria</span>
                <span className="text-ink font-mono">{selected.geometry}</span>
                <span className="text-ink-muted">Carichi</span>
                <span className="text-ink font-mono">{selected.loads}</span>
                <span className="text-ink-muted">Atteso</span>
                <span className="text-ink-percorsi font-mono">{selected.expectedOutcome}</span>
              </div>
            </div>
            <div className="text-[10px] text-ink-muted leading-snug">
              I valori sono didattici e basati su NTC 2018 §4.2 · S275. Per
              verifiche reali sostituisci la sezione e i carichi nel pannello
              Make dopo il caricamento.
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setStep(1)}
                data-testid="percorsi-back"
                className="flex items-center gap-1 px-3 py-1.5 text-xs text-ink-muted hover:text-ink rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Cambia percorso
              </button>
              <div className="flex-1" />
              <button
                type="button"
                onClick={() => setStep(3)}
                data-testid="percorsi-next"
                className="px-3 py-1.5 bg-percorsi text-white text-xs font-medium rounded-md hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-percorsi/60"
              >
                Avanti
                <ChevronRight className="inline w-3.5 h-3.5 ml-0.5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3 — Conferma e carica */}
        {step === 3 && selected && (
          <div className="space-y-3" data-testid="percorsi-step-3">
            <div className="text-[10px] uppercase tracking-wider text-ink-muted font-mono font-semibold">
              Pronto a caricare
            </div>
            <div className="bg-bg-success border border-success/30 rounded-md p-3 text-[11px]">
              <div className="text-ink-success font-semibold mb-1">
                Carico "{selected.title}" come modello attivo
              </div>
              <div className="text-ink leading-snug">
                Verrai portato nel viewport con il modello già pronto. Da lì
                puoi premere <strong>Esegui</strong> in topbar (oppure F5) per
                lanciare l'analisi statica e vedere i risultati.
              </div>
            </div>
            <div className="text-[10px] text-ink-muted leading-snug">
              Studio Pro e Percorsi sono due porte sullo stesso modello — dopo
              il caricamento tutti i tool del rail sinistro (Make / Solve /
              Verify) restano accessibili.
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setStep(2)}
                data-testid="percorsi-back-2"
                className="flex items-center gap-1 px-3 py-1.5 text-xs text-ink-muted hover:text-ink rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Indietro
              </button>
              <div className="flex-1" />
              <button
                type="button"
                onClick={handleConfirm}
                data-testid="percorsi-confirm"
                className="px-3 py-1.5 bg-percorsi text-white text-xs font-medium rounded-md hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-percorsi/60"
              >
                Carica modello e analizza →
              </button>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
}
