/**
 * VerifyPanel (Sprint 5 G11 / alpha.26) — brief v1.2.1 Step 7.5.
 *
 * Macro-panel "Verify" con 5 tab Eurocodi + NTC. Wrappa VerificationPanel
 * (EC3 main) + EC2/EC5/EC8 dedicati + NTCCombinations.
 */
import {
  IconShieldCheck, IconBuildingFactory2, IconBolt,
  IconWood, IconMountain, IconFlag,
} from "@tabler/icons-react";
import { useWorkspaceStore } from "../../store/workspaceStore";
import { PanelChrome, type PanelTab } from "./PanelChrome";
import { VerificationPanel } from "../../components/panels/VerificationPanel";
import { EC2Panel } from "../../components/panels/EC2Panel";
import { EC5Panel } from "../../components/panels/EC5Panel";
import { EC8Panel } from "../../components/panels/EC8Panel";
import { NTCCombinationsPanel } from "../../components/panels/NTCCombinationsPanel";


const TABS: PanelTab[] = [
  { id: "ec2",   label: "EC2" },
  { id: "ec3",   label: "EC3" },
  { id: "ec5",   label: "EC5" },
  { id: "ec8",   label: "EC8" },
  { id: "ntc18", label: "NTC18" },
];


export function VerifyPanel() {
  const closeLeft = useWorkspaceStore((s) => s.closeLeftPanel);
  const setTab = useWorkspaceStore((s) => s.setLeftTab);
  const tab = useWorkspaceStore((s) => s.currentLeftTab) ?? "ec3";

  return (
    <PanelChrome
      side="left"
      title="Verify"
      Icon={IconShieldCheck}
      subtitle="Verifiche normative"
      tabs={TABS}
      activeTab={tab}
      onTabChange={setTab}
      onClose={closeLeft}
      testId="panel-verify"
    >
      <div className="p-2 space-y-3">
        {tab === "ec2" && (
          <Section title="EC2 — Calcestruzzo armato" icon={IconBuildingFactory2}>
            <EC2Panel />
          </Section>
        )}
        {tab === "ec3" && (
          <Section title="EC3 — Acciaio" icon={IconBolt}>
            <VerificationPanel />
          </Section>
        )}
        {tab === "ec5" && (
          <Section title="EC5 — Legno" icon={IconWood}>
            <EC5Panel />
          </Section>
        )}
        {tab === "ec8" && (
          <Section title="EC8 — Sismica" icon={IconMountain}>
            <EC8Panel />
          </Section>
        )}
        {tab === "ntc18" && (
          <Section title="NTC 2018 — Combinazioni" icon={IconFlag}>
            <NTCCombinationsPanel />
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
  icon: typeof IconShieldCheck;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-ink-muted font-semibold px-1 pt-1 pb-1.5">
        <Icon size={12} />
        {title}
      </h3>
      {children}
    </div>
  );
}
