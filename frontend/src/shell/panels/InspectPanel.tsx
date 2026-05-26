/**
 * InspectPanel (Sprint 5 G11 / alpha.26 · v1.7 T2).
 *
 * Macro-panel "Inspect" rail destro. v1.7 T2: refactor da tab orizzontali
 * a pattern **hub-first** coerente con Make/Solve/Verify panel.
 *   - tab=null → mostra PanelHub con 5 card (Statica/Modale/Dinamica/
 *     Iso 3D/Fatica) coerenti col mockup_reference.html
 *   - tab="statica"... → drill-in con PanelBreadcrumb sticky + contenuto
 *
 * Modalita' contestuale (selectedNodeId): vista NodeDetail diretta,
 * bypassando l'hub.
 */
import {
  IconChartArea, IconArrowRight, IconWaveSine, IconActivity,
  IconBox, IconRefresh,
} from "@tabler/icons-react";
import { useWorkspaceStore } from "../../store/workspaceStore";
import { useRightRailStore } from "../../store/rightRailStore";
import { useResultsStore } from "../../store/resultsStore";
import { useSelectionStore } from "../../store/selectionStore";
import { useAnalysisStore } from "../../store/analysisStore";
import { useRunAnalysis } from "../../hooks/useAnalysis";
import { EmptyState } from "../../components/ui/EmptyState";
import { FeatureButton } from "../../components/ui/FeatureButton";
import type { FeatureId } from "../../lib/preconditions";
import { PanelChrome } from "./PanelChrome";
import { PanelHub, PanelBreadcrumb, type HubCard } from "../../components/shell/panels/PanelHubNav";
import { InsightPanel } from "../../components/shell/InsightPanel";
import { GPS_FYD } from "../../lib/gpsTrust";
import { Check, AlertTriangle, Circle, Sparkles } from "lucide-react";
import { NodeDetail } from "./inspect/NodeDetail";
import { DriftPanel } from "../../components/panels/DriftPanel";
import { ConvergencePanel } from "../../components/panels/ConvergencePanel";
import { IsosurfacePanel } from "../../components/panels/IsosurfacePanel";
import { FatiguePanel } from "../../components/panels/FatiguePanel";
import { LiveMonitorPanel } from "../../components/panels/LiveMonitorPanel";


// v1.7 T2: hub-first navigation per Inspect. 5 card primarie coerenti
// con Make/Solve/Verify panel (stesso pattern, stessi tone).
const HUB_CARDS: HubCard[] = [
  { id: "statica",  label: "Statica",  sub: "Spostamenti · stress · solve time",      icon: IconArrowRight as unknown as HubCard["icon"], tone: "info" },
  { id: "modale",   label: "Modale",   sub: "Modi propri · frequenze · masse modali", icon: IconWaveSine as unknown as HubCard["icon"],   tone: "success" },
  { id: "dinamica", label: "Dinamica", sub: "Time-history · drift · convergenza",      icon: IconActivity as unknown as HubCard["icon"],   tone: "purple" },
  { id: "iso3d",    label: "Iso 3D",   sub: "Iso-superfici 3D di Von Mises",          icon: IconBox as unknown as HubCard["icon"],        tone: "coral" },
  { id: "fatica",   label: "Fatica",   sub: "Verifica EC3-1-9 · cicli · UR",          icon: IconRefresh as unknown as HubCard["icon"],    tone: "warn" },
];


const TAB_LABELS: Record<string, string> = {
  statica:  "Statica",
  modale:   "Modale",
  dinamica: "Dinamica",
  iso3d:    "Iso 3D",
  fatica:   "Fatica",
};


export function InspectPanel() {
  const closeRight = useWorkspaceStore((s) => s.closeRightPanel);
  const closeRail = useRightRailStore((s) => s.close);
  const setTab = useWorkspaceStore((s) => s.setRightTab);
  // v1.7 T2: tab=null = hub mode (5 card iniziali). Coerenza con MakePanel.
  const tabRaw = useWorkspaceStore((s) => s.currentRightTab);
  const isHub = tabRaw === null || tabRaw === undefined;
  const tab = tabRaw ?? "statica";

  const staticRes = useResultsStore((s) => s.staticResults);
  const modalRes = useResultsStore((s) => s.modalResults);
  const dynamicRes = useResultsStore((s) => s.dynamicResults);
  const setAnalysisType = useAnalysisStore((s) => s.setAnalysisType);
  const runAnalysis = useRunAnalysis();

  const selectedNodeId = useSelectionStore((s) => s.selectedNodeId);

  function handleClose() {
    closeRight();
    closeRail();
    useSelectionStore.getState().clear();
  }

  // ── Modalita' "Inspect nodo": vista contestuale senza hub/tabs ───────────
  if (selectedNodeId !== null) {
    return (
      <PanelChrome
        side="right"
        title="Inspect"
        Icon={IconChartArea}
        subtitle={`Nodo N${selectedNodeId}`}
        onClose={handleClose}
        testId="panel-inspect-node"
      >
        <NodeDetail nodeId={selectedNodeId} />
      </PanelChrome>
    );
  }

  // ── Modalita' "Hub": 5 card primarie ────────────────────────────────────
  if (isHub) {
    return (
      <PanelChrome
        side="right"
        title="Inspect"
        Icon={IconChartArea}
        subtitle="Risultati"
        onClose={handleClose}
        testId="panel-inspect"
      >
        {/* v2.6.4 A.3 UC3/3b/4 (c6 spec): post-statica InsightPanel
            switching dinamico per soglia UR_max (success/warn/danger). */}
        {staticRes && <ResultsInsightHero setTab={setTab} />}
        {/* v2.6.4 B.1 (empty-states-catalog § 2.4): nessun risultato disponibile. */}
        {!staticRes && <ResultsEmptyState />}
        <PanelHub
          cards={HUB_CARDS}
          onSelect={(id) => setTab(id)}
          testId="inspect-hub"
        />
      </PanelChrome>
    );
  }

  // ── Modalita' "Drill-in": breadcrumb + contenuto sub-view ───────────────
  return (
    <PanelChrome
      side="right"
      title="Inspect"
      Icon={IconChartArea}
      subtitle={TAB_LABELS[tab] ?? "Risultati"}
      onClose={handleClose}
      testId="panel-inspect"
    >
      <div className="flex-1 flex flex-col min-h-0">
        <PanelBreadcrumb
          root="Inspect"
          current={TAB_LABELS[tab] ?? "Risultati"}
          onBack={() => setTab(null)}
        />
        <div className="flex-1 overflow-y-auto p-2">
          {tab === "statica" && (
            staticRes ? (
              <Section title="Risultati statica" icon={IconArrowRight}>
                <KV label="Max u" value={`${staticRes.max_displacement.toExponential(2)} m`} />
                <KV label="Max σ" value={`${(staticRes.max_stress / 1e6).toFixed(1)} MPa`} />
                <KV label="Solve time" value={`${staticRes.solve_time_ms.toFixed(0)} ms`} />
              </Section>
            ) : (
              /* v2.5.6 cluster F (BUG-058+061): EmptyState con CTA actionable
                 invece di solo messaggio. FeatureButton applica precondizioni
                 complete (modello+vincoli+carichi); tooltip italiano spiega
                 cosa manca se non disponibile. */
              <EmptyState
                icon={<IconArrowRight className="w-5 h-5" />}
                title="Nessun risultato statica"
                description="Esegui un'analisi statica per popolare i risultati: Max u, Max σ, solve time."
                action={
                  <FeatureButton
                    featureId={"run-static" as FeatureId}
                    variant="run"
                    size="md"
                    onClick={() => {
                      setAnalysisType("static");
                      runAnalysis();
                    }}
                    data-testid="inspect-empty-run-static"
                  >
                    Esegui analisi statica
                  </FeatureButton>
                }
              />
            )
          )}

          {tab === "modale" && (
            modalRes ? (
              <Section title="Modi propri" icon={IconWaveSine}>
                {modalRes.modes.slice(0, 5).map((m, i) => (
                  <KV key={i} label={`Modo ${i + 1}`} value={`${m.frequency_hz.toFixed(3)} Hz`} />
                ))}
              </Section>
            ) : (
              <EmptyState
                icon={<IconWaveSine className="w-5 h-5" />}
                title="Nessun risultato modale"
                description="Esegui un'analisi modale (Lanczos) per popolare modi propri, frequenze e masse modali."
                action={
                  <FeatureButton
                    featureId={"run-modal" as FeatureId}
                    variant="run"
                    size="md"
                    onClick={() => {
                      setAnalysisType("modal");
                      runAnalysis();
                    }}
                    data-testid="inspect-empty-run-modal"
                  >
                    Esegui analisi modale
                  </FeatureButton>
                }
              />
            )
          )}

          {tab === "dinamica" && (
            dynamicRes ? (
              <Section title="Time-history" icon={IconActivity}>
                <DriftPanel />
                <ConvergencePanel />
                <LiveMonitorPanel />
              </Section>
            ) : (
              <Empty msg="Nessun risultato dinamica. Esegui da Solve → Dinamica." />
            )
          )}

          {tab === "iso3d" && (
            <Section title="Iso-superfici 3D" icon={IconBox}>
              <IsosurfacePanel />
            </Section>
          )}

          {tab === "fatica" && (
            <Section title="Fatica EC3-1-9" icon={IconRefresh}>
              <FatiguePanel />
            </Section>
          )}
        </div>
      </div>
    </PanelChrome>
  );
}


function Section({
  title, icon: Icon, children,
}: {
  title: string;
  icon: typeof IconChartArea;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <h3 className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wide-2 text-ink-3 font-semibold px-1 pt-1 pb-2">
        <Icon size={12} />
        {title}
      </h3>
      {children}
    </div>
  );
}


function KV({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center px-2.5 py-1.5 bg-bg-panel border border-border text-sm">
      <span className="font-mono text-[10px] uppercase tracking-wide-1 text-ink-3 font-semibold">{label}</span>
      <span className="font-mono text-ink font-semibold tabular-nums">{value}</span>
    </div>
  );
}


function Empty({ msg }: { msg: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-4 text-center gap-2">
      <IconChartArea size={28} className="text-ink-4" stroke={1.5} />
      <p className="text-sm text-ink-2 leading-relaxed max-w-[34ch]">{msg}</p>
    </div>
  );
}


/**
 * v2.6.4 A.3 UC3/3b/4 (c6 spec) — Hero InsightPanel post-statica con
 * switching dinamico per soglia UR_max:
 *   - UR_max < 0.70  → tone="success", title "Tutti gli elementi sono in sicurezza"
 *   - 0.70 ≤ UR < 0.95 → tone="warn",  title "{N} elementi tra UR 0.70 e 0.95"
 *   - UR_max ≥ 0.95  → tone="danger",  title "{N} elementi superano UR 0.95"
 *
 * UR è derivato live da `staticRes.max_stress / GPS_FYD.s275` (allineato
 * a VerifyChecksLive / ResultsInsightAuto / PercorsiBeamWizard step 5).
 * Action: post-success → "Genera report"; post-warn/danger → drill-in
 * sulla tab Statica (tab="statica") che ospita i dettagli element-by-element.
 */
function ResultsInsightHero({ setTab }: { setTab: (id: string) => void }) {
  const staticRes = useResultsStore((s) => s.staticResults);
  if (!staticRes) return null;

  const sigmaMPa = staticRes.max_stress / 1e6;
  const urS275 = sigmaMPa / GPS_FYD.s275;
  const maxDispMm = staticRes.max_displacement * 1000;

  // Soglie come da c6 spec § 5 UC3/3b/4.
  if (urS275 >= 0.95) {
    // UC4 — danger
    return (
      <div className="px-3 pt-3" data-testid="results-insight-uc4">
        <InsightPanel
          tone="danger"
          eyebrow="ANALISI STATICA · ATTENZIONE"
          title="Elementi sopra UR 0.95"
          items={[
            { icon: AlertTriangle, text: `Modello globale · UR ${urS275.toFixed(2)} · NTC § 4.2.4.1` },
            { icon: Circle, text: `Spostamento max ${maxDispMm.toFixed(2)} mm` },
            { icon: Circle, text: `Max σ = ${sigmaMPa.toFixed(1)} MPa · S275 fyd = ${GPS_FYD.s275.toFixed(0)} MPa` },
          ]}
          action={{
            label: "Apri Verifiche live",
            onClick: () => {
              // Switching workspace verso Verifiche è cross-store. Per ora
              // apriamo la Statica tab dentro Inspect, che ospita i dettagli.
              setTab("statica");
            },
          }}
        />
      </div>
    );
  }

  if (urS275 >= 0.70) {
    // UC3b — warn intermedio
    return (
      <div className="px-3 pt-3" data-testid="results-insight-uc3b">
        <InsightPanel
          tone="warn"
          eyebrow="ANALISI STATICA · MARGINE RIDOTTO"
          title={`UR ${urS275.toFixed(2)} su modello globale`}
          items={[
            { icon: AlertTriangle, text: `Modello globale · UR ${urS275.toFixed(2)} · NTC § 4.2.4.1` },
            { icon: Circle, text: `Spostamento max ${maxDispMm.toFixed(2)} mm` },
            { icon: Circle, text: "Valuta verifica per stati limite di esercizio" },
          ]}
          action={{
            label: "Vai a Statica",
            onClick: () => setTab("statica"),
          }}
        />
      </div>
    );
  }

  /* UC3 — success */
  return (
    <div className="px-3 pt-3" data-testid="results-insight-uc3">
      <InsightPanel
        tone="success"
        eyebrow="ANALISI STATICA · COMPLETATA"
        title="Tutti gli elementi sono in sicurezza"
        items={[
          { icon: Check, text: `UR max ${urS275.toFixed(2)} su modello globale · NTC § 4.2.4.1` },
          { icon: Check, text: `Spostamento max ${maxDispMm.toFixed(2)} mm` },
          { icon: Check, text: `Solver: ${staticRes.solve_time_ms.toFixed(0)} ms` },
        ]}
        action={{
          label: "Genera report",
          onClick: () => window.dispatchEvent(new Event("feapro:open-export-pdf")),
        }}
      />
    </div>
  );
}


/**
 * v2.6.4 B.1 (empty-states-catalog § 2.4) — Inspect/ResultsPanel quando
 * non c'è ancora staticResults. Diagnostica nel body (perché è vuoto)
 * + action rerun analisi statica.
 */
function ResultsEmptyState() {
  const setAnalysisType = useAnalysisStore((s) => s.setAnalysisType);
  const runAnalysis = useRunAnalysis();
  return (
    <div className="px-3 pt-3" data-testid="results-empty-state">
      <EmptyState
        icon={<Sparkles className="w-5 h-5" />}
        title="Risultati non disponibili"
        description="Lancia un'analisi statica per popolare risultati e verifiche. I diagrammi e gli UR sono derivati live dal solver."
        action={
          <FeatureButton
            featureId="run-static"
            variant="run"
            size="md"
            onClick={() => {
              setAnalysisType("static");
              void runAnalysis();
            }}
            data-testid="results-empty-run-static"
          >
            Esegui analisi statica
          </FeatureButton>
        }
      />
    </div>
  );
}
