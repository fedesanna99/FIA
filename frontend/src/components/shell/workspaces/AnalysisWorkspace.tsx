/**
 * Workspace ANALISI — selezione tipo + parametri.
 *
 * Tab (M3):
 *  - linear    → AnalysisSettings (statica / modale / dinamica / buckling)
 *  - pushover  → PushoverPanel (FASE 6)
 *  - seismic   → SeismicTHPanel (FASE 12, multi-componente X/Y/Z)
 *  - fatigue   → FatiguePanel (FASE 14, Rainflow + Miner)
 *  - monitor   → log streaming (placeholder fino a WS progress)
 */
import { Cpu, Sliders, Activity, TrendingUp, Waves, Repeat } from "lucide-react";
import { useWorkspaceStore } from "../../../store/workspaceStore";
import { AnalysisSettings } from "../../panels/AnalysisSettings";
import { PushoverPanel } from "../../panels/PushoverPanel";
import { SeismicTHPanel } from "../../panels/SeismicTHPanel";
import { FatiguePanel } from "../../panels/FatiguePanel";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../ui/Tabs";
import { EmptyState } from "../../ui/EmptyState";
import { WorkspaceHeader } from "../WorkspaceHeader";

export function AnalysisWorkspace() {
  const activeTab = useWorkspaceStore((s) => s.activeTab.analysis);
  const setTab = useWorkspaceStore((s) => s.setTab);

  return (
    <div className="flex flex-col h-full">
      <WorkspaceHeader
        icon={<Cpu className="h-4 w-4" />}
        title="Analisi"
        description="Lineare · push-over · time-history · fatica · monitor live."
      />
      <Tabs
        value={activeTab}
        onValueChange={(v) => setTab("analysis", v)}
        className="flex flex-col flex-1 min-h-0"
      >
        <TabsList>
          <TabsTrigger value="linear">
            <Sliders className="h-3.5 w-3.5 mr-1" /> Lineare
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

        <TabsContent value="linear" className="flex-1 overflow-auto">
          <AnalysisSettings />
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
          <EmptyState
            title="Monitor live in arrivo"
            description="Log streaming del solver con barra di avanzamento via WebSocket /ws/progress. Sarà attivato quando i solver lunghi inietteranno progress_cb."
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
