/**
 * Workspace VERIFICHE — confronto domanda vs resistenza secondo normative.
 *
 * Tab (M5):
 *  - ec3   → VerificationPanel (EN 1993-1-1, acciaio) — itera sugli elementi
 *  - ec2   → EC2Panel (CA: flessione + taglio, form-driven)
 *  - ec5   → EC5Panel (legno: resistenze EN 1995-1-1)
 *  - ec8   → EC8Panel (sismica: spettro + q-factor)
 *  - ntc   → NTCCombinationsPanel (combinazioni SLU/SLE NTC 2018)
 */
import { ShieldCheck } from "lucide-react";
import { useWorkspaceStore } from "../../../store/workspaceStore";
import { VerificationPanel } from "../../panels/VerificationPanel";
import { EC2Panel } from "../../panels/EC2Panel";
import { EC5Panel } from "../../panels/EC5Panel";
import { EC8Panel } from "../../panels/EC8Panel";
import { NTCCombinationsPanel } from "../../panels/NTCCombinationsPanel";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../ui/Tabs";
import { WorkspaceHeader } from "../WorkspaceHeader";

export function VerifyWorkspace() {
  const activeTab = useWorkspaceStore((s) => s.activeTab.verify);
  const setTab = useWorkspaceStore((s) => s.setTab);

  return (
    <div className="flex flex-col h-full">
      <WorkspaceHeader
        icon={<ShieldCheck className="h-4 w-4" />}
        title="Verifiche"
        description="EC3 acciaio · EC2 CA · EC5 legno · EC8 sismica · NTC combinazioni."
      />
      <Tabs
        value={activeTab}
        onValueChange={(v) => setTab("verify", v)}
        className="flex flex-col flex-1 min-h-0"
      >
        <TabsList>
          <TabsTrigger value="ec3">EC3</TabsTrigger>
          <TabsTrigger value="ec2">EC2</TabsTrigger>
          <TabsTrigger value="ec5">EC5</TabsTrigger>
          <TabsTrigger value="ec8">EC8</TabsTrigger>
          <TabsTrigger value="ntc">NTC</TabsTrigger>
        </TabsList>

        <TabsContent value="ec3" className="flex-1 overflow-auto">
          <VerificationPanel />
        </TabsContent>
        <TabsContent value="ec2" className="flex-1 overflow-auto">
          <EC2Panel />
        </TabsContent>
        <TabsContent value="ec5" className="flex-1 overflow-auto">
          <EC5Panel />
        </TabsContent>
        <TabsContent value="ec8" className="flex-1 overflow-auto">
          <EC8Panel />
        </TabsContent>
        <TabsContent value="ntc" className="flex-1 overflow-auto">
          <NTCCombinationsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
