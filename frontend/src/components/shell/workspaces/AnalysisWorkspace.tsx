/**
 * Workspace ANALISI — selezione tipo + parametri.
 *
 * Tab:
 *  - linear    → AnalysisSettings (statica / modale / dinamica / buckling)
 *  - nonlinear → NonlinearPanel (BL-1, Newton-Raphson + cavi tension-only)
 *  - arclength → ArcLengthPanel (BL-2, Crisfield post-buckling)
 *  - pushover  → PushoverPanel (FASE 6)
 *  - seismic   → SeismicTHPanel (FASE 12, multi-componente X/Y/Z)
 *  - fatigue   → FatiguePanel (FASE 14, Rainflow + Miner)
 *  - monitor   → log streaming (placeholder fino a WS progress)
 */
import {
  Cpu, Sliders, Activity, TrendingUp, Waves, Repeat, GitBranch, Compass,
} from "lucide-react";
import { useWorkspaceStore } from "../../../store/workspaceStore";
import { AnalysisSettings } from "../../panels/AnalysisSettings";
import { NonlinearPanel } from "../../panels/NonlinearPanel";
import { ArcLengthPanel } from "../../panels/ArcLengthPanel";
import { PushoverPanel } from "../../panels/PushoverPanel";
import { SeismicTHPanel } from "../../panels/SeismicTHPanel";
import { FatiguePanel } from "../../panels/FatiguePanel";
import { LiveMonitorPanel } from "../../panels/LiveMonitorPanel";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../ui/Tabs";
import { WorkspaceHeader } from "../WorkspaceHeader";

export function AnalysisWorkspace() {
  const activeTab = useWorkspaceStore((s) => s.activeTab.analysis);
  const setTab = useWorkspaceStore((s) => s.setTab);

  return (
    <div className="flex flex-col h-full">
      <WorkspaceHeader
        icon={<Cpu className="h-4 w-4" />}
        title="Analisi"
        description="Lineare · non-lineare · arc-length · push-over · time-history · fatica."
      />
      <Tabs
        value={activeTab}
        onValueChange={(v) => setTab("analysis", v)}
        className="flex flex-col flex-1 min-h-0"
      >
        {/* TabsList scrollabile orizzontalmente su mobile per evitare overflow */}
        <div className="overflow-x-auto">
          <TabsList>
            <TabsTrigger value="linear">
              <Sliders className="h-3.5 w-3.5 mr-1" /> Lineare
            </TabsTrigger>
            <TabsTrigger value="nonlinear">
              <GitBranch className="h-3.5 w-3.5 mr-1" /> Non-lin.
            </TabsTrigger>
            <TabsTrigger value="arclength">
              <Compass className="h-3.5 w-3.5 mr-1" /> Arc-len.
            </TabsTrigger>
            <TabsTrigger value="pushover">
              <TrendingUp className="h-3.5 w-3.5 mr-1" /> Push-over
            </TabsTrigger>
            <TabsTrigger value="seismic">
              <Waves className="h-3.5 w-3.5 mr-1" /> Sismica TH
            </TabsTrigger>
            <TabsTrigger value="fatigue">
              <Repeat className="h-3.5 w-3.5 mr-1" /> Fatica
            </TabsTrigger>
            <TabsTrigger value="monitor">
              <Activity className="h-3.5 w-3.5 mr-1" /> Monitor
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="linear" className="flex-1 overflow-auto">
          <AnalysisSettings />
        </TabsContent>

        <TabsContent value="nonlinear" className="flex-1 overflow-auto">
          <NonlinearPanel />
        </TabsContent>

        <TabsContent value="arclength" className="flex-1 overflow-auto">
          <ArcLengthPanel />
        </TabsContent>

        <TabsContent value="pushover" className="flex-1 overflow-auto">
          <PushoverPanel />
        </TabsContent>

        <TabsContent value="seismic" className="flex-1 overflow-auto">
          <SeismicTHPanel />
        </TabsContent>

        <TabsContent value="fatigue" className="flex-1 overflow-auto">
          <FatiguePanel />
        </TabsContent>

        <TabsContent value="monitor" className="flex-1 overflow-auto">
          <LiveMonitorPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
