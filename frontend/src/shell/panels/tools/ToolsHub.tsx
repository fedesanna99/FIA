/**
 * ToolsHub — entrypoint hub Tools panel.
 *
 * v1.7 T1: refactor per usare PanelHub component + HubTone centralizzato
 * (no piu' duplicazione di TONE_STYLE locale). 6 toni disponibili.
 */
import {
  Bot, Bug, Download, FileInput, GitCompareArrows, Receipt,
  Ruler, ShieldCheck, Users, Waves,
} from "lucide-react";
import type { ToolsView } from "../ToolsPanel";
import { PanelHub, type HubCard, type HubTone } from "../../../components/shell/panels/PanelHubNav";

interface Hub {
  id: Exclude<ToolsView, "hub">;
  label: string;
  sub: string;
  icon: HubCard["icon"];
  tone: HubTone;
}

const HUBS: Hub[] = [
  {
    id: "measure-snapshot",
    label: "Misure e snapshot",
    sub: "Distanze, angoli, congela stato",
    icon: Ruler,
    tone: "info",
  },
  {
    id: "import",
    label: "Import",
    sub: "DXF, IFC, JSON con wizard",
    icon: FileInput,
    tone: "info",
  },
  {
    id: "export",
    label: "Export rapido",
    sub: "PDF client, JSON, CSV risultati",
    icon: Download,
    tone: "success",
  },
  {
    id: "server-export",
    label: "Export server",
    sub: "PDF reportlab, XLSX, DXF, IFC4",
    icon: Download,
    tone: "success",
  },
  {
    id: "validation",
    label: "Validazione",
    sub: "Benchmark NAFEMS e report solver",
    icon: ShieldCheck,
    tone: "purple",
  },
  {
    id: "auto-detect",
    label: "Auto-detect",
    sub: "Duplicati, nodi coincidenti, carichi orfani",
    icon: Bug,
    tone: "purple",
  },
  {
    id: "accelerograms",
    label: "Accelerogrammi",
    sub: "Catalogo PEER/ESM e sintetici",
    icon: Waves,
    tone: "info",
  },
  {
    id: "compare",
    label: "Compare A/B",
    sub: "Diff strutturale e risultati",
    icon: GitCompareArrows,
    tone: "coral",
  },
  {
    id: "ai-copilot",
    label: "AI Copilot",
    sub: "Domande sul modello attivo",
    icon: Bot,
    tone: "purple",
  },
  {
    id: "collab",
    label: "Collab",
    sub: "Presence, sessione e log live",
    icon: Users,
    tone: "coral",
  },
  {
    id: "cost-preview",
    label: "Cost preview",
    sub: "Stima crediti pre-run",
    icon: Receipt,
    tone: "coral",
  },
];

export function ToolsHub({ onSelect }: { onSelect: (v: Exclude<ToolsView, "hub">) => void }) {
  const cards: HubCard[] = HUBS.map((h) => ({
    id: h.id,
    label: h.label,
    sub: h.sub,
    icon: h.icon,
    tone: h.tone,
  }));
  return (
    <PanelHub
      cards={cards}
      onSelect={(id) => onSelect(id as Exclude<ToolsView, "hub">)}
      testId="tools-hub"
    />
  );
}
