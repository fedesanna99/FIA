/**
 * VerifyPanel (Sprint 5 G11 / alpha.26) — brief v1.2.1 Step 7.5.
 *
 * Macro-panel "Verify" con 5 tab Eurocodi + NTC. Wrappa VerificationPanel
 * (EC3 main) + EC2/EC5/EC8 dedicati + NTCCombinations.
 */
import {
  IconShieldCheck, IconBuildingFactory2, IconBolt,
  IconWood, IconMountain, IconFlag, IconActivity,
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
import { VerifyChecksLive } from "../../components/shell/VerifyChecksLive";


// v1.8 (post-T6): TABS rimosso — Verify drill-in usa solo PanelBreadcrumb
// come navigation (coerenza con InspectPanel + Make/SolvePanel).


// v1.5.2 Task 39 + v2.0 PR15 T7: hub-first per Verify. 6 card.
// "Live" (PR15 T7) e' la prima per visibilita': mostra UC normativi
// derivati live da staticResults via ChecksRail + ChecksDetailTable.
const HUB_CARDS: HubCard[] = [
  { id: "live",  label: "Verifiche live",         sub: "UC S275 · EC3 · NTC derivati live",        icon: IconActivity as unknown as HubCard["icon"],         tone: "info" },
  { id: "ec2",   label: "EC2 — Calcestruzzo",     sub: "Flessione · taglio · armatura",            icon: IconBuildingFactory2 as unknown as HubCard["icon"], tone: "info" },
  { id: "ec3",   label: "EC3 — Acciaio",          sub: "Resistenza · stabilita' · LTB",            icon: IconBolt as unknown as HubCard["icon"],             tone: "success" },
  { id: "ec5",   label: "EC5 — Legno",            sub: "k_mod · classi servizio · UR combinati",   icon: IconWood as unknown as HubCard["icon"],             tone: "warn" },
  { id: "ec8",   label: "EC8 — Sismica",          sub: "Spettro elastico/design · fattore q",      icon: IconMountain as unknown as HubCard["icon"],         tone: "purple" },
  { id: "ntc18", label: "NTC 2018",               sub: "Combinazioni SLU/SLE/sismica + envelope",  icon: IconFlag as unknown as HubCard["icon"],             tone: "coral" },
];


// v2.1.6 nav-dedup: etichette brevi per non creare titoli mobile lunghi del
// tipo "Verifiche · EC2 — Calcestruzzo". L'icona della hub-card + il sub-text
// del PanelHub forniscono già il dettaglio quando l'utente sceglie.
const TAB_LABELS: Record<string, string> = {
  live:  "Live",
  ec2:   "EC2",
  ec3:   "EC3",
  ec5:   "EC5",
  ec8:   "EC8",
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
      {/* v2.1.6 nav-dedup: rimossi wrapper <Section title=...> con h3.
          La PanelBreadcrumb sopra (desktop) e l'header del MobilePanel
          (mobile) mostrano già "Verify › Verifiche live", il duplicato
          h3 era solo rumore. */}
      <div className="p-1.5 sm:p-2 space-y-3 min-w-0">
        {tab === "live"  && <VerifyChecksLive />}
        {tab === "ec2"   && <EC2Panel />}
        {tab === "ec3"   && <VerificationPanel />}
        {tab === "ec5"   && <EC5Panel />}
        {tab === "ec8"   && <EC8Panel />}
        {tab === "ntc18" && <NTCCombinationsPanel />}
      </div>
    </PanelChrome>
  );
}
