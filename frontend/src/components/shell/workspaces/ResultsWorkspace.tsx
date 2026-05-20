/**
 * Workspace RISULTATI — visualizzazione + diagrammi + postprocess avanzato.
 *
 * Tab:
 *  - viewport   → ViewportControls (toggle deformata, stress, modi)
 *  - data       → ResultsPanel (numerici)
 *  - drift      → DriftPanel (interstory drift sismico, FASE 12)
 *  - modes      → ModeSuperpositionPanel (sovrapposizione modale, FASE 16)
 *  - iso3d      → IsosurfacePanel (BL-7, marching tet/hex)
 *  - quality    → ConvergencePanel + ZZErrorPanel (FASE 19)
 *  - snapshots  → SnapshotsPanel (confronto risultati salvati)
 */
import {
  BarChart3, Eye, Table, Camera, Activity, Layers, ScanSearch, Globe,
} from "lucide-react";
import { useWorkspaceStore } from "../../../store/workspaceStore";
import { useResultsStore } from "../../../store/resultsStore";
import { ViewportControls } from "../../panels/ViewportControls";
import { ResultsPanel } from "../../results/ResultsPanel";
import { SnapshotsPanel } from "../../panels/SnapshotsPanel";
import { DriftPanel } from "../../panels/DriftPanel";
import { ModeSuperpositionPanel } from "../../panels/ModeSuperpositionPanel";
import { ConvergencePanel } from "../../panels/ConvergencePanel";
import { ZZErrorPanel } from "../../panels/ZZErrorPanel";
import { IsosurfacePanel } from "../../panels/IsosurfacePanel";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../ui/Tabs";
import { EmptyState } from "../../ui/EmptyState";
import { Badge } from "../../ui/Badge";
import { WorkspaceHeader } from "../WorkspaceHeader";

export function ResultsWorkspace() {
  const activeTab = useWorkspaceStore((s) => s.activeTab.results);
  const setTab = useWorkspaceStore((s) => s.setTab);
  const hasResults = useResultsStore(
    (s) => !!(s.staticResults || s.modalResults || s.dynamicResults),
  );

  return (
    <div className="flex flex-col h-full">
      <WorkspaceHeader
        icon={<BarChart3 className="h-4 w-4" />}
        title="Risultati"
        description="Visualizzazione, drift, sovrapposizione modale, qualità mesh."
        badge={hasResults && <Badge variant="success" size="sm">●</Badge>}
      />
      <Tabs
        value={activeTab}
        onValueChange={(v) => setTab("results", v)}
        className="flex flex-col flex-1 min-h-0"
      >
        <div className="overflow-x-auto">
          <TabsList>
            <TabsTrigger value="viewport">
              <Eye className="h-3.5 w-3.5 mr-1" /> Vista
            </TabsTrigger>
            <TabsTrigger value="data">
              <Table className="h-3.5 w-3.5 mr-1" /> Dati
            </TabsTrigger>
            <TabsTrigger value="drift">
              <Activity className="h-3.5 w-3.5 mr-1" /> Drift
            </TabsTrigger>
            <TabsTrigger value="modes">
              <Layers className="h-3.5 w-3.5 mr-1" /> Modi
            </TabsTrigger>
            <TabsTrigger value="iso3d">
              <Globe className="h-3.5 w-3.5 mr-1" /> Iso 3D
            </TabsTrigger>
            <TabsTrigger value="quality">
              <ScanSearch className="h-3.5 w-3.5 mr-1" /> Qualità
            </TabsTrigger>
            <TabsTrigger value="snapshots">
              <Camera className="h-3.5 w-3.5 mr-1" /> Snapshot
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="viewport" className="flex-1 overflow-auto">
          <ViewportControls />
        </TabsContent>

        <TabsContent value="data" className="flex-1 overflow-auto">
          {hasResults ? (
            <ResultsPanel />
          ) : (
            <EmptyState
              title="Nessun risultato ancora"
              description='Vai al workspace Analisi e premi "Esegui" per produrre risultati.'
            />
          )}
        </TabsContent>

        <TabsContent value="drift" className="flex-1 overflow-auto">
          <DriftPanel />
        </TabsContent>

        <TabsContent value="modes" className="flex-1 overflow-auto">
          <ModeSuperpositionPanel />
        </TabsContent>

        <TabsContent value="iso3d" className="flex-1 overflow-auto">
          <IsosurfacePanel />
        </TabsContent>

        <TabsContent value="quality" className="flex-1 overflow-auto">
          <div className="space-y-3">
            <ConvergencePanel />
            <ZZErrorPanel />
          </div>
        </TabsContent>

        <TabsContent value="snapshots" className="flex-1 overflow-auto">
          <SnapshotsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
