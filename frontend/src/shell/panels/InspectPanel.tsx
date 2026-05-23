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
import { PanelChrome } from "./PanelChrome";
import { PanelHub, PanelBreadcrumb, type HubCard } from "../../components/shell/panels/PanelHubNav";
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
              <Empty msg="Nessun risultato statica. Esegui da Solve → Lineari." />
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
              <Empty msg="Nessun risultato modale. Esegui da Solve → Modale." />
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
