/**
 * Workspace MODELLO — geometria, carichi, vincoli, materiali, selezione.
 *
 * Tab:
 *  - tree       → ModelTree (gerarchia entità) + EditorBar in alto
 *  - inspector  → SelectionInspector (entità selezionata)
 *  - library    → MaterialsLibrary (materiali + sezioni)
 *
 * Mesh + Schema avanzato: in arrivo nei milestone M2.
 */
import { Boxes, ListTree, MousePointer2, Library } from "lucide-react";
import { useWorkspaceStore } from "../../../store/workspaceStore";
import { useModelStore } from "../../../store/modelStore";
import { EditorBar } from "../../panels/EditorBar";
import { ModelTree } from "../../panels/ModelTree";
import { SelectionInspector } from "../../panels/SelectionInspector";
import { MaterialsLibrary } from "../../panels/MaterialsLibrary";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../ui/Tabs";
import { EmptyState } from "../../ui/EmptyState";
import { WorkspaceHeader } from "../WorkspaceHeader";

export function ModelWorkspace() {
  const activeTab = useWorkspaceStore((s) => s.activeTab.model);
  const setTab = useWorkspaceStore((s) => s.setTab);
  const model = useModelStore((s) => s.model);

  return (
    <div className="flex flex-col h-full">
      <WorkspaceHeader
        icon={<Boxes className="h-4 w-4" />}
        title="Modello"
        description="Costruisci la struttura: nodi, elementi, carichi, vincoli."
      />
      <EditorBar />
      <Tabs
        value={activeTab}
        onValueChange={(v) => setTab("model", v)}
        className="flex flex-col flex-1 min-h-0"
      >
        <TabsList>
          <TabsTrigger value="tree">
            <ListTree className="h-3.5 w-3.5 mr-1.5" /> Albero
          </TabsTrigger>
          <TabsTrigger value="inspector">
            <MousePointer2 className="h-3.5 w-3.5 mr-1.5" /> Selezione
          </TabsTrigger>
          <TabsTrigger value="library">
            <Library className="h-3.5 w-3.5 mr-1.5" /> Libreria
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tree" className="flex-1 overflow-auto">
          {model ? (
            <ModelTree />
          ) : (
            <EmptyState
              title="Nessun modello caricato"
              description="Crea un nuovo modello dalla barra superiore o seleziona uno dei seed esempi."
            />
          )}
        </TabsContent>

        <TabsContent value="inspector" className="flex-1 overflow-auto">
          {model ? (
            <SelectionInspector />
          ) : (
            <EmptyState
              title="Niente da ispezionare"
              description="Seleziona un'entità nel viewport 3D o nell'albero del modello."
            />
          )}
        </TabsContent>

        <TabsContent value="library" className="flex-1 overflow-auto">
          <MaterialsLibrary />
        </TabsContent>
      </Tabs>
    </div>
  );
}
