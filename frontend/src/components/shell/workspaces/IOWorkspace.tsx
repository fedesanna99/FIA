/**
 * Workspace I/O & COLLAB — import/export, AI, collaborazione, diagnostica.
 *
 * Tab (M6 completo):
 *  - autodetect → ValidationPanel (auto-detect issues / FASE 23)
 *  - import     → ImportPanel (DXF + IFC drag&drop)
 *  - export     → ExportServerPanel (PDF reportlab + Excel + DXF + IFC4)
 *  - accel      → AccelerogramsPanel (catalogo PEER + sintetici)
 *  - compare    → ComparePanel (modelli A vs B)
 *  - ai         → AICopilotPanel (chat con Gemini/Mock)
 *  - collab     → CollabPanel (WebSocket presence + log)
 */
import {
  ArrowRightLeft, BugPlay, Download, Upload, Bot, Users,
  GitCompare, Waves,
} from "lucide-react";
import { useWorkspaceStore } from "../../../store/workspaceStore";
import { ValidationPanel } from "../../panels/ValidationPanel";
import { ImportPanel } from "../../panels/ImportPanel";
import { ExportServerPanel } from "../../panels/ExportServerPanel";
import { AccelerogramsPanel } from "../../panels/AccelerogramsPanel";
import { ComparePanel } from "../../panels/ComparePanel";
import { AICopilotPanel } from "../../panels/AICopilotPanel";
import { CollabPanel } from "../../panels/CollabPanel";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../ui/Tabs";
import { WorkspaceHeader } from "../WorkspaceHeader";

export function IOWorkspace() {
  const activeTab = useWorkspaceStore((s) => s.activeTab.io);
  const setTab = useWorkspaceStore((s) => s.setTab);

  return (
    <div className="flex flex-col h-full">
      <WorkspaceHeader
        icon={<ArrowRightLeft className="h-4 w-4" />}
        title="I/O & Collab"
        description="Import · export · accel · compare · AI · collab · validazione."
      />
      <Tabs
        value={activeTab}
        onValueChange={(v) => setTab("io", v)}
        className="flex flex-col flex-1 min-h-0"
      >
        <TabsList>
          <TabsTrigger value="autodetect"><BugPlay className="h-3.5 w-3.5 mr-1" /> Validaz.</TabsTrigger>
          <TabsTrigger value="import"><Upload  className="h-3.5 w-3.5 mr-1" /> Import</TabsTrigger>
          <TabsTrigger value="export"><Download className="h-3.5 w-3.5 mr-1" /> Export</TabsTrigger>
          <TabsTrigger value="accel"><Waves className="h-3.5 w-3.5 mr-1" /> Accel</TabsTrigger>
          <TabsTrigger value="compare"><GitCompare className="h-3.5 w-3.5 mr-1" /> Compare</TabsTrigger>
          <TabsTrigger value="ai"><Bot className="h-3.5 w-3.5 mr-1" /> AI</TabsTrigger>
          <TabsTrigger value="collab"><Users className="h-3.5 w-3.5 mr-1" /> Collab</TabsTrigger>
        </TabsList>

        <TabsContent value="autodetect" className="flex-1 overflow-auto">
          <ValidationPanel />
        </TabsContent>
        <TabsContent value="import" className="flex-1 overflow-auto">
          <ImportPanel />
        </TabsContent>
        <TabsContent value="export" className="flex-1 overflow-auto">
          <ExportServerPanel />
        </TabsContent>
        <TabsContent value="accel" className="flex-1 overflow-auto">
          <AccelerogramsPanel />
        </TabsContent>
        <TabsContent value="compare" className="flex-1 overflow-auto">
          <ComparePanel />
        </TabsContent>
        <TabsContent value="ai" className="flex-1 overflow-auto">
          <AICopilotPanel />
        </TabsContent>
        <TabsContent value="collab" className="flex-1 overflow-auto">
          <CollabPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
