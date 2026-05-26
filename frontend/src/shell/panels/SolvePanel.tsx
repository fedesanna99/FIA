/**
 * SolvePanel (Sprint 5 G10 / alpha.25) — brief v1.2.1 Step 7.3.
 *
 * Panel laterale sinistra workflow "Solve" con 4 tab + **CostPreviewCard
 * gradient blu-viola sempre visibile** sopra i parametri (flagship UX).
 *
 * 4 tab (brief):
 *   - Lineari: Statica / Modale / Buckling (lista verticale + parametri inline)
 *   - Dinamica: Time-History Newmark + Pushover
 *   - Sismica: Response Spectrum + Seismic Time-History
 *   - Non-lin.: Nonlinear NR + Arc-Length Crisfield
 *
 * Wrappa i pannelli v1.2 esistenti (AnalysisSettings, NonlinearPanel,
 * etc.) all'interno della struttura mockup. Non duplica logica.
 */
import { useState } from "react";
import clsx from "clsx";
import {
  IconBolt, IconArrowRight, IconWaveSine, IconArrowsVertical,
} from "@tabler/icons-react";
import { Activity, Zap, Waves, GitBranch } from "lucide-react";
import { FeatureButton } from "../../components/ui/FeatureButton";
import type { FeatureId } from "../../lib/preconditions";
import { useWorkspaceStore } from "../../store/workspaceStore";
import { useLeftRailStore } from "../../store/leftRailStore";
import { useAnalysisStore } from "../../store/analysisStore";
import { useModelStore } from "../../store/modelStore";
import { useRunAnalysis } from "../../hooks/useAnalysis";
import { CostPreviewCard } from "./CostPreviewCard";
import { PanelChrome } from "./PanelChrome";
import { PanelHub, PanelBreadcrumb, type HubCard } from "../../components/shell/panels/PanelHubNav";
// Pannelli legacy che wrappiamo:
import { NonlinearPanel } from "../../components/panels/NonlinearPanel";
import { ArcLengthPanel } from "../../components/panels/ArcLengthPanel";
import { PushoverPanel } from "../../components/panels/PushoverPanel";
import { SeismicTHPanel } from "../../components/panels/SeismicTHPanel";


// v1.8 (post-T6): TABS rimosso — Solve drill-in usa solo PanelBreadcrumb
// come navigation (coerenza con InspectPanel + MakePanel).


// v1.5.2 Task 39: hub-first navigation. La prima vista quando si apre
// Solve e' una griglia di 4 card grandi, una per tipologia di analisi.
const HUB_CARDS: HubCard[] = [
  { id: "lineari",  label: "Lineari",     sub: "Statica · Modale · Buckling",          icon: Activity,  tone: "info" },
  { id: "dinamica", label: "Dinamica",    sub: "Newmark β-γ · Pushover",               icon: Zap,       tone: "success" },
  { id: "sismica",  label: "Sismica",     sub: "Time-history multi-componente NTC",    icon: Waves,     tone: "purple" },
  { id: "nonlin",   label: "Non-lineari", sub: "Newton-Raphson · Arc-Length",          icon: GitBranch, tone: "coral" },
];

const TAB_LABELS: Record<string, string> = {
  lineari:  "Lineari",
  dinamica: "Dinamica",
  sismica:  "Sismica",
  nonlin:   "Non-lineari",
};


type SolverId = "static" | "modal" | "buckling";


interface AnalysisOption {
  id: SolverId;
  label: string;
  description: string;
  icon: typeof IconArrowRight;
}


const LINEAR_OPTIONS: AnalysisOption[] = [
  { id: "static",   label: "Statica lineare",  description: "K u = F",                icon: IconArrowRight },
  { id: "modal",    label: "Modale (Lanczos)", description: "Autovalori K + M",       icon: IconWaveSine },
  { id: "buckling", label: "Buckling Eulero",  description: "Carico critico K + Kg",  icon: IconArrowsVertical },
];


export function SolvePanel() {
  // alpha.31 Task 25: la X deve chiudere SIA workspace SIA rail.
  const closeLeft = () => {
    useWorkspaceStore.getState().closeLeftPanel();
    useLeftRailStore.getState().close();
  };
  const setTab = useWorkspaceStore((s) => s.setLeftTab);
  // v1.5.2 Task 39: tab=null = hub mode (4 card iniziali).
  const tabRaw = useWorkspaceStore((s) => s.currentLeftTab);
  const isHub = tabRaw === null || tabRaw === undefined;
  const tab = tabRaw ?? "lineari";
  const model = useModelStore((s) => s.model);
  const { analysisType, setAnalysisType, isRunning } = useAnalysisStore();
  const run = useRunAnalysis();

  // Local state: solver selezionato (sotto-opzione del tab Lineari)
  const [selectedLinear, setSelectedLinear] = useState<SolverId>(
    (analysisType as SolverId) || "static"
  );

  function handleRun(solver: SolverId) {
    if (!model) return;
    setAnalysisType(solver as "static" | "modal" | "dynamic");
    run();
  }

  // v1.5.2 Task 39: vista iniziale = hub 4 card. Click su card → entra
  // nel tab corrispondente. I tab restano disponibili in header per
  // navigation laterale; lo "← Solve" del breadcrumb torna all'hub.
  if (isHub) {
    return (
      <PanelChrome
        side="left"
        title="Solve"
        Icon={IconBolt}
        subtitle={isRunning ? "Esec." : "Pronto"}
        onClose={closeLeft}
        testId="panel-solve"
      >
        <PanelHub
          cards={HUB_CARDS}
          onSelect={(id) => setTab(id)}
          testId="solve-hub"
        />
      </PanelChrome>
    );
  }

  return (
    <PanelChrome
      side="left"
      title="Solve"
      Icon={IconBolt}
      subtitle={isRunning ? "Esec." : "Pronto"}
      onClose={closeLeft}
      testId="panel-solve"
    >
      {/* v1.5.2 Task 39: breadcrumb back-to-hub */}
      <PanelBreadcrumb
        root="Solve"
        current={TAB_LABELS[tab] ?? tab}
        onBack={() => setTab(null)}
      />
      {/* ── LINEARI ───────────────────────────────────────────────────────── */}
      {tab === "lineari" && (
        <div className="flex flex-col">
          <Section title="Analisi disponibili">
            {LINEAR_OPTIONS.map((opt) => (
              <AnalysisRow
                key={opt.id}
                opt={opt}
                active={selectedLinear === opt.id}
                onClick={() => {
                  setSelectedLinear(opt.id);
                  setAnalysisType(opt.id as "static" | "modal" | "dynamic");
                }}
              />
            ))}
          </Section>

          {/* Flagship: cost preview SEMPRE visibile sopra i parametri */}
          <CostPreviewCard analysisId={selectedLinear} />

          <Section title="Esegui">
            {/* v2.5.6 cluster F (BUG-027): FeatureButton con featureId dinamico
                in base al solver selezionato. Precondizione completa (modello
                + vincoli + carichi per static/buckling, solo + vincoli per
                modale). Il tooltip italiano spiega cosa manca. */}
            <FeatureButton
              featureId={(`run-${selectedLinear}`) as FeatureId}
              variant="run"
              size="md"
              onClick={() => handleRun(selectedLinear)}
              loading={isRunning}
              data-testid="solve-run-linear"
              className="w-full"
            >
              <IconBolt size={14} />
              <span className="flex-1">
                {isRunning ? "In esecuzione…" : `Esegui ${LINEAR_OPTIONS.find((o) => o.id === selectedLinear)?.label.toLowerCase() ?? ""}`}
              </span>
              <kbd className="bg-black/15 border border-white/20 text-white text-[10px] px-1.5 py-0.5 font-mono uppercase tracking-wide-1 font-medium">F5</kbd>
            </FeatureButton>
          </Section>
        </div>
      )}

      {/* ── DINAMICA ─────────────────────────────────────────────────────── */}
      {tab === "dinamica" && (
        <div className="flex flex-col">
          <Section title="Dinamica Time-History">
            <p className="text-[11px] text-ink-3 leading-relaxed mb-2">
              Newmark β-γ con damping Rayleigh. Pushover incrementale con
              cerniere plastiche (NTC §7.3.4.1).
            </p>
            <CostPreviewCard analysisId="dynamic" />
          </Section>

          <div className="px-2 pb-2">
            <PushoverPanel />
          </div>
        </div>
      )}

      {/* ── SISMICA ──────────────────────────────────────────────────────── */}
      {tab === "sismica" && (
        <div className="flex flex-col">
          <Section title="Sismica Time-History">
            <p className="text-[11px] text-ink-3 leading-relaxed mb-2">
              Multi-componente X/Y/Z con accelerogrammi PEER o sintetici.
            </p>
            <CostPreviewCard analysisId="seismic" />
          </Section>

          <div className="px-2 pb-2">
            <SeismicTHPanel />
          </div>
        </div>
      )}

      {/* ── NON-LINEARE ──────────────────────────────────────────────────── */}
      {tab === "nonlin" && (
        <div className="flex flex-col">
          <Section title="Non-lineari geometrici">
            <p className="text-[11px] text-ink-3 leading-relaxed mb-2">
              Newton-Raphson incrementale + Arc-Length Crisfield per
              snap-through / cavi compressione-only.
            </p>
            <CostPreviewCard analysisId="nonlinear" />
          </Section>

          <div className="px-2 pb-2 space-y-3">
            <NonlinearPanel />
            <ArcLengthPanel />
          </div>
        </div>
      )}
    </PanelChrome>
  );
}


// ── Helpers UI ──────────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="font-mono text-[10px] uppercase tracking-wide-2 text-ink-3 font-semibold px-3 pt-3 pb-2">
        {title}
      </h3>
      <div className="px-2 pb-1.5">{children}</div>
    </section>
  );
}


function AnalysisRow({
  opt, active, onClick,
}: {
  opt: AnalysisOption;
  active: boolean;
  onClick: () => void;
}) {
  const Icon = opt.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={`solve-option-${opt.id}`}
      className={clsx(
        "w-full flex items-center gap-2.5 px-2.5 py-2 text-sm transition-colors border-l-2",
        active
          ? "bg-accent-subtle text-accent border-accent"
          : "text-ink hover:bg-bg-hover border-transparent",
      )}
      aria-pressed={active}
    >
      <Icon size={15} className={active ? "text-accent" : "text-ink-3"} />
      <div className="flex-1 text-left min-w-0">
        <div className="font-medium truncate">{opt.label}</div>
        <div className="font-mono text-[10px] text-ink-3 truncate mt-0.5">{opt.description}</div>
      </div>
    </button>
  );
}
