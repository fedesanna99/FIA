/**
 * OnboardingTour — modal di benvenuto al primo accesso.
 *
 * Mostra 6 step che presentano l'architettura UI:
 *   1. Welcome / overview
 *   2. Modello workspace
 *   3. Analisi workspace
 *   4. Risultati workspace
 *   5. Verifiche workspace
 *   6. I/O & Collab workspace + Ctrl+K
 *
 * Persistenza: localStorage flag `feapro-onboarding-seen`.
 */
import { useState, useEffect } from "react";
import {
  Boxes, Cpu, BarChart3, ShieldCheck, ArrowRightLeft,
  ChevronLeft, ChevronRight, X, Sparkles, Command, MapPin,
  Hammer, Eye, Layers, Wrench,
} from "lucide-react";
import { useWorkspaceStore, type Workspace } from "../../store/workspaceStore";
import { Button } from "../ui/Button";
import { cn } from "../ui/cn";

// v3: bump per re-mostrare onboarding dopo refactor UI 6-rail (Sprint 4
// alpha.20). Aggiornato welcome step con i nuovi label Make/Solve/Verify.
const STORAGE_KEY = "feapro-onboarding-seen-v3";

interface Step {
  id: string;
  title: string;
  description: string;
  body: React.ReactNode;
  /** Se impostato, switcha al workspace durante il passo. */
  workspace?: Workspace;
  icon: React.ReactNode;
}

const STEPS: Step[] = [
  {
    id: "welcome",
    icon: <Sparkles className="h-8 w-8 text-accent" />,
    title: "Benvenuto in FEA Pro",
    description: "Analisi strutturale agli elementi finiti — moderna, didattica, completa.",
    body: (
      <div className="space-y-2 text-sm text-ink-muted">
        <p>L'app e' organizzata in <strong className="text-ink">due rail laterali</strong> ispirati al workflow strutturale.</p>

        <p className="font-semibold text-ink pt-1 text-xs uppercase tracking-wider">A sinistra · costruisci</p>
        <ul className="space-y-1.5 list-none pl-0 text-xs">
          <li className="flex items-center gap-2"><Hammer       className="h-4 w-4 text-accent" /> <strong>Make</strong> — geometria, mesh, carichi, vincoli</li>
          <li className="flex items-center gap-2"><Cpu          className="h-4 w-4 text-accent" /> <strong>Solve</strong> — statica · modale · dinamica · sismica · pushover</li>
          <li className="flex items-center gap-2"><ShieldCheck  className="h-4 w-4 text-accent" /> <strong>Verify</strong> — EC2/3/5/8 + NTC + fatica</li>
        </ul>

        <p className="font-semibold text-ink pt-1 text-xs uppercase tracking-wider">A destra · esplora</p>
        <ul className="space-y-1.5 list-none pl-0 text-xs">
          <li className="flex items-center gap-2"><Eye          className="h-4 w-4 text-accent" /> <strong>Inspect</strong> — risultati delle analisi</li>
          <li className="flex items-center gap-2"><Layers       className="h-4 w-4 text-accent" /> <strong>View</strong> — overlay viewport (deformata, stress, iso)</li>
          <li className="flex items-center gap-2"><Wrench       className="h-4 w-4 text-accent" /> <strong>Tools</strong> — cost preview, compare, misure, BIM</li>
        </ul>

        <p className="text-[11px] text-ink-dim pt-2">
          Tip: usa <kbd className="bg-bg px-1 rounded border border-border">1</kbd>–<kbd className="bg-bg px-1 rounded border border-border">3</kbd> per i rail principali,{" "}
          <kbd className="bg-bg px-1 rounded border border-border">Ctrl K</kbd> per la palette comandi globale.
        </p>
      </div>
    ),
  },
  {
    id: "model",
    workspace: "model",
    icon: <Boxes className="h-8 w-8 text-accent" />,
    title: "1 · Workspace MODELLO",
    description: "Geometria, materiali, sezioni, carichi, vincoli.",
    body: (
      <div className="space-y-2 text-xs text-ink-muted">
        <p>Costruisci la struttura con shortcut rapidi: <kbd className="bg-bg px-1 rounded border border-border">N</kbd> nodo · <kbd className="bg-bg px-1 rounded border border-border">E</kbd> elemento · <kbd className="bg-bg px-1 rounded border border-border">L</kbd> carico · <kbd className="bg-bg px-1 rounded border border-border">C</kbd> vincolo · <kbd className="bg-bg px-1 rounded border border-border">M</kbd> wizard mesh.</p>
        <p>Il <strong className="text-ink">wizard mesh</strong> supporta:</p>
        <ul className="list-disc pl-4 space-y-0.5">
          <li>Linea (beam/truss 2D-3D)</li>
          <li>Rettangolo (shell Q4 o tri T3)</li>
          <li>Box solido 3D (H8)</li>
          <li><strong className="text-ink">Parametrica</strong> — L-shape, T-shape, cerchio, anello via Delaunay</li>
        </ul>
        <p className="pt-1">Per fondazioni: attiva <strong className="text-ink">winkler_k</strong> sull'elemento beam2d o usa vincoli <strong className="text-ink">spring</strong> con flag <strong className="text-ink">compression-only</strong>.</p>
      </div>
    ),
  },
  {
    id: "analysis",
    workspace: "analysis",
    icon: <Cpu className="h-8 w-8 text-accent" />,
    title: "2 · Workspace ANALISI",
    description: "Lineare · push-over · time-history · fatica · monitor live.",
    body: (
      <div className="space-y-2 text-xs text-ink-muted">
        <p>Oltre alle analisi lineari standard, hai 3 analisi avanzate:</p>
        <ul className="list-disc pl-4 space-y-0.5">
          <li><strong className="text-ink">Push-over</strong> — incremento di carico + cerniere plastiche (NTC §7.3.4.1)</li>
          <li><strong className="text-ink">Sismica TH</strong> — multi-componente X/Y/Z con accelerogrammi PEER o sintetici</li>
          <li><strong className="text-ink">Fatica</strong> — Rainflow ASTM + curve S-N EC3-1-9 + danno Miner</li>
        </ul>
        <p>Per eseguire l'analisi corrente: <kbd className="bg-bg px-1 rounded border border-border">F5</kbd> o click <strong className="text-ink">Esegui</strong> nella TopBar.</p>
      </div>
    ),
  },
  {
    id: "results",
    workspace: "results",
    icon: <BarChart3 className="h-8 w-8 text-accent" />,
    title: "3 · Workspace RISULTATI",
    description: "Deformata, drift, modi, qualità mesh.",
    body: (
      <div className="space-y-2 text-xs text-ink-muted">
        <p>Visualizza i risultati delle analisi nel viewport 3D ed esplora i dati nelle tab:</p>
        <ul className="list-disc pl-4 space-y-0.5">
          <li><strong className="text-ink">Drift</strong> — interstory drift sismico con soglie EC8</li>
          <li><strong className="text-ink">Modi</strong> — sovrapposizione modale con slider weight</li>
          <li><strong className="text-ink">Qualità</strong> — convergenza Richardson + errore ZZ per h-refinement</li>
        </ul>
      </div>
    ),
  },
  {
    id: "verify",
    workspace: "verify",
    icon: <ShieldCheck className="h-8 w-8 text-accent" />,
    title: "4 · Workspace VERIFICHE",
    description: "Eurocodici + NTC 2018.",
    body: (
      <div className="space-y-2 text-xs text-ink-muted">
        <p>Tutte le verifiche normative principali:</p>
        <ul className="list-disc pl-4 space-y-0.5">
          <li><strong className="text-ink">EC3</strong> — acciaio (iter automatico su tutti i beam in acciaio)</li>
          <li><strong className="text-ink">EC2</strong> — CA: flessione + taglio (form-driven)</li>
          <li><strong className="text-ink">EC5</strong> — legno: k_mod + resistenze + UR combinati</li>
          <li><strong className="text-ink">EC8</strong> — sismica: spettro elastico/design + fattore q</li>
          <li><strong className="text-ink">NTC</strong> — combinazioni SLU/SLE + envelope</li>
        </ul>
      </div>
    ),
  },
  {
    id: "io-collab",
    workspace: "io",
    icon: <ArrowRightLeft className="h-8 w-8 text-accent" />,
    title: "5 · Workspace I/O & COLLAB",
    description: "Import/export · AI Copilot · multi-utente.",
    body: (
      <div className="space-y-2 text-xs text-ink-muted">
        <p>7 tab per tutte le interazioni con l'esterno:</p>
        <ul className="list-disc pl-4 space-y-0.5">
          <li>Validazione automatica del modello (FASE 23)</li>
          <li>Import DXF / IFC, Export PDF / Excel / DXF / IFC</li>
          <li>Catalogo accelerogrammi PEER + sintetici Kanai-Tajimi / Boore</li>
          <li>Confronto modelli A vs B</li>
          <li>Chat AI Copilot sul modello attivo</li>
          <li>Sessione collaborativa WebSocket</li>
        </ul>
        <div className="flex items-center gap-2 pt-2 text-[11px]">
          <Command className="h-3.5 w-3.5" />
          <span>Premi <kbd className="bg-bg px-1 rounded border border-border">Ctrl+K</kbd> per la palette comandi globale.</span>
        </div>
      </div>
    ),
  },
  {
    id: "climate-loads",
    icon: <MapPin className="h-8 w-8 text-accent" />,
    title: "🆕 6 · Climate Loads — vento, neve, sismica da location",
    description: "Calcola loads EN 1991 + NTC 2018 da coordinate reali.",
    body: (
      <div className="space-y-2 text-xs text-ink-muted">
        <p>Click <kbd className="bg-bg px-1 rounded border border-border">📍 Loads</kbd> in TopBar per:</p>
        <ul className="list-disc pl-4 space-y-0.5">
          <li><strong className="text-ink">5 preset rapidi</strong> Italia (Roma, Milano, L'Aquila, Cagliari, Cortina) — 1 click, no API call</li>
          <li><strong className="text-ink">Search live</strong> qualsiasi città mondo via Open-Meteo</li>
          <li>Calcolo automatico <strong className="text-ink">q_p</strong> (vento), <strong className="text-ink">s_design</strong> (neve), <strong className="text-ink">a_g/g</strong> (sismica)</li>
          <li>Badge floating top-left sempre visibile, persiste tra refresh</li>
        </ul>
        <p>Click sul badge → <strong className="text-ink">🔧 Applica come carichi al modello</strong>:</p>
        <ul className="list-disc pl-4 space-y-0.5">
          <li>Tributary area <strong className="text-ink">per-nodo da topologia</strong> (Σ F = q × A_totale esatto)</li>
          <li>Inviluppo vento <strong className="text-ink">4 direzioni</strong> ±X, ±Y (NTC §3.3.3 completo)</li>
          <li>Sismica come <strong className="text-ink">ground_accel</strong> model-level</li>
          <li>Labels traceability: <code className="text-[10px]">"Wind EN1991-1-4 [Roma, +X]"</code></li>
        </ul>
        <p className="text-[11px] pt-1">Sorgente dati: Open-Meteo (ERA5 80y), USGS Earthquake, Open-Elevation. Tutto via fallback chain F8 con cache 1y SQLite.</p>
      </div>
    ),
  },
];

export function OnboardingTour() {
  const setWorkspace = useWorkspaceStore((s) => s.setWorkspace);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  // Check primo accesso
  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        setOpen(true);
      }
    } catch {
      // localStorage non disponibile, skip
    }
  }, []);

  // Cambia workspace quando lo step lo richiede (preview live)
  useEffect(() => {
    if (open && STEPS[step]?.workspace) {
      setWorkspace(STEPS[step].workspace!);
    }
  }, [open, step, setWorkspace]);

  const finish = (skip = false) => {
    setOpen(false);
    try {
      localStorage.setItem(STORAGE_KEY, skip ? "skipped" : "completed");
    } catch {}
  };

  if (!open) return null;
  const s = STEPS[step];
  const isFirst = step === 0;
  const isLast = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
         onClick={() => finish(true)}>
      <div
        className="w-[540px] max-w-[calc(100vw-32px)] bg-bg-elevated border border-border rounded-lg shadow-dialog overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
        role="dialog" aria-modal="true" aria-label="Onboarding tour"
      >
        {/* Header */}
        <header className="flex items-start justify-between gap-2 px-5 pt-5 pb-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-12 h-12 rounded-lg bg-accent-subtle flex items-center justify-center flex-shrink-0">
              {s.icon}
            </div>
            <div>
              <h2 className="text-base font-semibold text-ink">{s.title}</h2>
              <p className="text-xs text-ink-muted mt-0.5">{s.description}</p>
            </div>
          </div>
          <button
            onClick={() => finish(true)}
            className="text-ink-muted hover:text-ink p-1 rounded hover:bg-bg-hover flex-shrink-0"
            aria-label="Salta tour"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {/* Body */}
        <div className="px-5 pb-4 min-h-[160px]">
          {s.body}
        </div>

        {/* Stepper indicators */}
        <div className="flex items-center justify-center gap-1.5 py-2">
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === step ? "w-8 bg-accent" : "w-1.5 bg-border hover:bg-border-light",
              )}
              aria-label={`Vai allo step ${i + 1}`}
            />
          ))}
        </div>

        {/* Footer */}
        <footer className="flex items-center justify-between gap-2 px-4 py-3 border-t border-border bg-bg-panel/50">
          <Button variant="ghost" size="sm" onClick={() => finish(true)}>
            Salta
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm"
                    iconLeft={<ChevronLeft className="h-3.5 w-3.5" />}
                    disabled={isFirst}
                    onClick={() => setStep((i) => Math.max(0, i - 1))}>
              Indietro
            </Button>
            {isLast ? (
              <Button variant="primary" size="sm" onClick={() => finish(false)}>
                Inizia
              </Button>
            ) : (
              <Button variant="primary" size="sm"
                      iconRight={<ChevronRight className="h-3.5 w-3.5" />}
                      onClick={() => setStep((i) => Math.min(STEPS.length - 1, i + 1))}>
                Avanti
              </Button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}

/** Reset esterno (es. da bottone "Riavvia tour" nelle settings, M7+) */
export function resetOnboarding() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
  } catch {}
}
