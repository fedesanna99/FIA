/**
 * InspectPanel (Sprint 5 G11 / alpha.26) — brief v1.2.1 Step 7.5.
 *
 * Macro-panel "Inspect" rail destro: tab Statica / Modale / Dinamica /
 * Iso 3D / Fatica. Wrappa pannelli results v1.2 esistenti.
 */
import {
  IconChartArea, IconArrowRight, IconWaveSine, IconActivity,
  IconBox, IconRefresh,
} from "@tabler/icons-react";
import { useWorkspaceStore } from "../../store/workspaceStore";
import { useRightRailStore } from "../../store/rightRailStore";
import { useResultsStore } from "../../store/resultsStore";
import { PanelChrome, type PanelTab } from "./PanelChrome";
import { DriftPanel } from "../../components/panels/DriftPanel";
import { ConvergencePanel } from "../../components/panels/ConvergencePanel";
import { IsosurfacePanel } from "../../components/panels/IsosurfacePanel";
import { FatiguePanel } from "../../components/panels/FatiguePanel";
import { LiveMonitorPanel } from "../../components/panels/LiveMonitorPanel";


const TABS: PanelTab[] = [
  { id: "statica",  label: "Statica" },
  { id: "modale",   label: "Modale" },
  { id: "dinamica", label: "Dinamica" },
  { id: "iso3d",    label: "Iso 3D" },
  { id: "fatica",   label: "Fatica" },
];


export function InspectPanel() {
  // alpha.26: il panel destro usa il rightRailStore ma manteniamo
  // currentRightTab via workspaceStore (brief schema).
  const closeRight = useWorkspaceStore((s) => s.closeRightPanel);
  const closeRail = useRightRailStore((s) => s.close);
  const setTab = useWorkspaceStore((s) => s.setRightTab);
  const tab = useWorkspaceStore((s) => s.currentRightTab) ?? "statica";

  const staticRes = useResultsStore((s) => s.staticResults);
  const modalRes = useResultsStore((s) => s.modalResults);
  const dynamicRes = useResultsStore((s) => s.dynamicResults);

  function handleClose() {
    closeRight();
    closeRail();
  }

  return (
    <PanelChrome
      side="right"
      title="Inspect"
      Icon={IconChartArea}
      subtitle="Risultati"
      tabs={TABS}
      activeTab={tab}
      onTabChange={setTab}
      onClose={handleClose}
      testId="panel-inspect"
    >
      <div className="p-2">
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
      <h3 className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-ink-muted font-semibold px-1 pt-1 pb-1.5">
        <Icon size={12} />
        {title}
      </h3>
      {children}
    </div>
  );
}


function KV({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between px-2 py-1.5 rounded bg-bg-hover text-xs">
      <span className="text-ink-muted">{label}</span>
      <span className="numeric text-ink font-medium">{value}</span>
    </div>
  );
}


function Empty({ msg }: { msg: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center gap-2">
      <IconChartArea size={24} className="text-ink-faint" stroke={1.5} />
      <p className="text-xs text-ink-muted leading-relaxed">{msg}</p>
    </div>
  );
}
