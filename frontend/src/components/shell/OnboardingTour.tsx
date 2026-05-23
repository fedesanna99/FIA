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
import { useLeftRailStore } from "../../store/leftRailStore";
import { Button } from "../ui/Button";
import { cn } from "../ui/cn";

// v4: bump per Sprint 5 alpha.28 — completo del brief v1.2.1.
// 9 step (welcome + Make/Solve/Verify + Inspect/View/Tools + Palette + Focus).
const STORAGE_KEY = "feapro-onboarding-seen-v4";

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
    // v1.5.2 Task 35: workspace "results" rimosso. Lo step ora preview il
    // rail destro Inspect (post-analisi) — workspace target è il piu'
    // contestuale "analysis" (Solve panel sinistro).
    workspace: "analysis",
    icon: <BarChart3 className="h-8 w-8 text-accent" />,
    title: "3 · Risultati nel rail destro · Inspect",
    description: "Deformata, drift, modi, qualità mesh — Inspect del rail destro.",
    body: (
      <div className="space-y-2 text-xs text-ink-muted">
        <p>Dopo aver eseguito un'analisi i risultati vivono nel <strong className="text-ink">rail destro · Inspect</strong> (icona occhio). Tab disponibili:</p>
        <ul className="list-disc pl-4 space-y-0.5">
          <li><strong className="text-ink">Statica</strong> — spostamenti, reazioni vincolari, σ Von Mises</li>
          <li><strong className="text-ink">Modale</strong> — frequenze, modi animati, massa partecipante</li>
          <li><strong className="text-ink">Dinamica</strong> — time-history nodi + envelope</li>
          <li><strong className="text-ink">Iso 3D</strong> — iso-superfici per modelli solidi</li>
        </ul>
        <p className="text-[11px] pt-1">Il drift sismico EC8 vive in <strong className="text-ink">Verify</strong> (sinistro). Cerca "drift" in Ctrl+K.</p>
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
    // v1.5.2 Task 35: workspace "io" rimosso. Import/export ora vivono in:
    //   - ImportWizard 4-step (Ctrl+K · "import" o Dashboard)
    //   - Tools del rail destro (Export PDF/XLSX/CSV/JSON/DXF)
    icon: <ArrowRightLeft className="h-8 w-8 text-accent" />,
    title: "5 · Import / Export / Collab",
    description: "Wizard import 4-step · Tools (rail destro) · palette per tutto.",
    body: (
      <div className="space-y-2 text-xs text-ink-muted">
        <p>L'I/O e' stato semplificato:</p>
        <ul className="list-disc pl-4 space-y-0.5">
          <li><strong className="text-ink">Import</strong> — wizard 4-step (Fonte → File → Anteprima → Conferma). Cerca "import" in Ctrl+K o usa Dashboard.</li>
          <li><strong className="text-ink">Export</strong> — rail destro · Tools · 5 formati (PDF / XLSX / CSV / JSON / DXF).</li>
          <li><strong className="text-ink">Validazione NAFEMS</strong> — rail destro · Tools · Validation.</li>
          <li><strong className="text-ink">AI Copilot</strong> — placeholder Sprint 5 (toast "soon"). Disponibile in palette + AvatarMenu.</li>
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
        <p>Click sull'avatar in alto a destra → <kbd className="bg-bg px-1 rounded border border-border">📍 Loads location</kbd> per:</p>
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
  // Sprint 5 alpha.28: 3 nuovi step brief-aligned
  {
    id: "right-rail",
    icon: <Eye className="h-8 w-8 text-accent" />,
    title: "7 · Rail destro — Inspect / View / Tools",
    description: "Esplora risultati, layer 3D e strumenti pro.",
    body: (
      <div className="space-y-2 text-xs text-ink-muted">
        <p>Sul lato destro hai 3 macro-panel sempre raggiungibili:</p>
        <ul className="space-y-1 list-none pl-0">
          <li className="flex items-start gap-2"><Eye className="h-3.5 w-3.5 mt-0.5 text-accent flex-shrink-0" /> <span><strong className="text-ink">Inspect</strong> · risultati: 5 tab Statica / Modale / Dinamica / Iso 3D / Fatica</span></li>
          <li className="flex items-start gap-2"><Layers className="h-3.5 w-3.5 mt-0.5 text-accent flex-shrink-0" /> <span><strong className="text-ink">View</strong> · layer 3D: toggle deformata, colormap σ_VM, iso-superfici, slider scala</span></li>
          <li className="flex items-start gap-2"><Wrench className="h-3.5 w-3.5 mt-0.5 text-accent flex-shrink-0" /> <span><strong className="text-ink">Tools</strong> · strumenti pro: misurazioni, snapshot, BIM viewer, NAFEMS report</span></li>
        </ul>
        <p className="text-[11px] pt-1">Toggle pattern come Linear / Figma: click su icona attiva chiude il pannello.</p>
      </div>
    ),
  },
  {
    id: "palette",
    icon: <Command className="h-8 w-8 text-accent" />,
    title: "8 · Command palette globale — Cmd+K",
    description: "Cerca tutto in 2 keystroke: comandi, pannelli, impostazioni.",
    body: (
      <div className="space-y-2 text-xs text-ink-muted">
        <p>Premi <kbd className="bg-bg px-1 rounded border border-border">Ctrl K</kbd> (o <kbd className="bg-bg px-1 rounded border border-border">Cmd K</kbd>) per aprire la palette globale fuzzy-search:</p>
        <ul className="list-disc pl-4 space-y-0.5">
          <li><strong className="text-ink">Suggeriti</strong> contestuali (top 3 in base al workspace attivo)</li>
          <li><strong className="text-ink">Comandi</strong> azioni globali (run, save, export, new model)</li>
          <li><strong className="text-ink">Pannelli</strong> apri qualsiasi pannello + tab</li>
          <li><strong className="text-ink">Impostazioni</strong> theme, lingua, account, cost preview mode</li>
          <li><strong className="text-ink">Climate Loads</strong> preset Italia + concetti EN/NTC</li>
          <li><strong className="text-ink">Aiuto</strong> documentazione, shortcut, OpenAPI</li>
        </ul>
        <p className="text-[11px] pt-1">Match fuzzy multilingue: digita "run" o "esegui", "theme" o "tema" — funziona uguale.</p>
      </div>
    ),
  },
  {
    id: "focus-mode",
    icon: <Sparkles className="h-8 w-8 text-accent" />,
    title: "9 · Focus mode — viewport pieno",
    description: "Quando vuoi solo il modello 3D, chiudi tutto in un click.",
    body: (
      <div className="space-y-2 text-xs text-ink-muted">
        <p>Per il momento "solo viewport" hai due modi:</p>
        <ul className="list-disc pl-4 space-y-0.5">
          <li>Click sull'avatar in alto a destra → <kbd className="bg-bg px-1 rounded border border-border">👁 Modalità focus</kbd></li>
          <li>Shortcut <kbd className="bg-bg px-1 rounded border border-border">Shift Space</kbd> da qualunque punto dell'app</li>
        </ul>
        <p>Chiude entrambi i rail e il pannello centrale, lasciando solo il viewport 3D massimizzato. Premi 1/2/3 o clicca un rail per ri-aprire un panel.</p>
        <p className="text-[11px] pt-1 mt-2">Buon lavoro! 🎉 Per rivedere questo tour: <kbd className="bg-bg px-1 rounded border border-border">?</kbd> in StatusBar.</p>
      </div>
    ),
  },
];

interface OnboardingTourProps {
  disabled?: boolean;
}

export function OnboardingTour({ disabled = false }: OnboardingTourProps) {
  const setWorkspace = useWorkspaceStore((s) => s.setWorkspace);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  // Check primo accesso
  useEffect(() => {
    if (disabled) {
      setOpen(false);
      return;
    }
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        setOpen(true);
      }
    } catch {
      // localStorage non disponibile, skip
    }
  }, [disabled]);

  useEffect(() => {
    const close = () => setOpen(false);
    window.addEventListener("feapro:close-onboarding", close);
    return () => window.removeEventListener("feapro:close-onboarding", close);
  }, []);

  // Cambia workspace quando lo step lo richiede (preview live).
  // alpha.31 hotfix: oltre allo store legacy serve anche aprire il LeftSlidePanel,
  // altrimenti il preview "live" del tour non mostra nulla.
  useEffect(() => {
    if (open && STEPS[step]?.workspace) {
      const ws = STEPS[step].workspace!;
      setWorkspace(ws);
      if (ws !== "docs") {
        useLeftRailStore.getState().open(ws);
      }
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 animate-fade-in"
         onClick={() => finish(true)}>
      <div
        className="w-[580px] max-w-[calc(100vw-32px)] bg-bg-elevated border border-border-light shadow-dialog overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
        role="dialog" aria-modal="true" aria-label="Onboarding tour"
      >
        {/* Header Precision */}
        <header className="flex items-start justify-between gap-2 px-5 pt-5 pb-3 bg-bg-panel border-b border-border">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-12 h-12 bg-accent-subtle border border-accent/30 flex items-center justify-center flex-shrink-0">
              {s.icon}
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-wide-2 text-ink-3 font-semibold mb-0.5">
                Step {step + 1}/{STEPS.length}
              </div>
              <h2 className="font-display text-lg font-semibold tracking-tight-1 text-ink">{s.title}</h2>
              <p className="text-sm text-ink-2 mt-0.5">{s.description}</p>
            </div>
          </div>
          <button
            onClick={() => finish(true)}
            className="text-ink-3 hover:text-ink p-1 hover:bg-bg-hover flex-shrink-0 transition-colors"
            aria-label="Salta tour"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {/* Body */}
        <div className="px-5 py-4 min-h-[160px]">
          {s.body}
        </div>

        {/* Stepper indicators sharp */}
        <div className="flex items-center justify-center gap-1 py-2 border-t border-border">
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={cn(
                "h-1.5 transition-all",
                i === step ? "w-8 bg-accent" : "w-1.5 bg-border hover:bg-border-strong",
              )}
              aria-label={`Vai allo step ${i + 1}`}
            />
          ))}
        </div>

        {/* Footer Precision */}
        <footer className="flex items-center justify-between gap-2 px-4 py-3 border-t border-border bg-bg-panel">
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
