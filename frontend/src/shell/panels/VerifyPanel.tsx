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
import { useLeftRailStore } from "../../store/leftRailStore";
import { PanelChrome } from "./PanelChrome";
import { PanelHub, PanelBreadcrumb, type HubCard } from "../../components/shell/panels/PanelHubNav";
import { VerificationPanel } from "../../components/panels/VerificationPanel";
import { EC2Panel } from "../../components/panels/EC2Panel";
import { EC5Panel } from "../../components/panels/EC5Panel";
import { EC8Panel } from "../../components/panels/EC8Panel";
import { NTCCombinationsPanel } from "../../components/panels/NTCCombinationsPanel";


// v1.8 (post-T6): TABS rimosso — Verify drill-in usa solo PanelBreadcrumb
// come navigation (coerenza con InspectPanel + Make/SolvePanel).


// v1.5.2 Task 39: hub-first per Verify. 5 card, una per normativa.
const HUB_CARDS: HubCard[] = [
  { id: "ec2",   label: "EC2 — Calcestruzzo",     sub: "Flessione · taglio · armatura",            icon: IconBuildingFactory2 as unknown as HubCard["icon"], tone: "info" },
  { id: "ec3",   label: "EC3 — Acciaio",          sub: "Resistenza · stabilita' · LTB",            icon: IconBolt as unknown as HubCard["icon"],             tone: "success" },
  { id: "ec5",   label: "EC5 — Legno",            sub: "k_mod · classi servizio · UR combinati",   icon: IconWood as unknown as HubCard["icon"],             tone: "warn" },
  { id: "ec8",   label: "EC8 — Sismica",          sub: "Spettro elastico/design · fattore q",      icon: IconMountain as unknown as HubCard["icon"],         tone: "purple" },
  { id: "ntc18", label: "NTC 2018",               sub: "Combinazioni SLU/SLE/sismica + envelope",  icon: IconFlag as unknown as HubCard["icon"],             tone: "coral" },
];


const TAB_LABELS: Record<string, string> = {
  ec2:   "EC2 — Calcestruzzo",
  ec3:   "EC3 — Acciaio",
  ec5:   "EC5 — Legno",
  ec8:   "EC8 — Sismica",
  ntc18: "NTC 2018",
};


export function VerifyPanel() {
  // alpha.31 Task 25: la X deve chiudere SIA workspace SIA rail.
  const closeLeft = () => {
    useWorkspaceStore.getState().closeLeftPanel();
    useLeftRailStore.getState().close();
  };
  const setTab = useWorkspaceStore((s) => s.setLeftTab);
  // v1.5.2 Task 39: tab=null = hub mode.
  const tabRaw = useWorkspaceStore((s) => s.currentLeftTab);
  const isHub  = tabRaw === null || tabRaw === undefined;
  const tab    = tabRaw ?? "ec3";

  if (isHub) {
    return (
      <PanelChrome
        side="left"
        title="Verify"
        Icon={IconShieldCheck}
        subtitle="Verifiche normative"
        onClose={closeLeft}
        testId="panel-verify"
      >
        <PanelHub
          cards={HUB_CARDS}
          onSelect={(id) => setTab(id)}
          testId="verify-hub"
        />
      </PanelChrome>
    );
  }

  return (
    <PanelChrome
      side="left"
      title="Verify"
      Icon={IconShieldCheck}
      subtitle="Verifiche normative"
      onClose={closeLeft}
      testId="panel-verify"
    >
      <PanelBreadcrumb
        root="Verify"
        current={TAB_LABELS[tab] ?? tab}
        onBack={() => setTab(null)}
      />
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
