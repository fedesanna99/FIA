/**
 * Command Palette (Ctrl+K / Cmd+K) — ricerca rapida fuzzy.
 *
 * Tipo VSCode. Una lista di azioni globali della app: switch workspace,
 * apertura dialog, esecuzione analisi, export. La lista è centralizzata qui.
 *
 * UX:
 *  - Ctrl+K toggle (gestito anche in useKeyboardShortcuts)
 *  - Esc chiude
 *  - Frecce e Enter navigano/eseguono
 */
import { Command } from "cmdk";
import { useEffect } from "react";
import {
  Boxes, Cpu, BarChart3, ShieldCheck, ArrowRightLeft, HelpCircle,
  Plus, Play, FileDown, FileUp, Layers, MousePointerClick,
} from "lucide-react";
import { useWorkspaceStore, type Workspace } from "../../store/workspaceStore";
import { useUIStore } from "../../store/uiStore";
import { useAnalysisStore } from "../../store/analysisStore";
import { useModelStore } from "../../store/modelStore";
import { useRunAnalysis } from "../../hooks/useAnalysis";
import { cn } from "../ui/cn";

type AnalysisType = "static" | "modal" | "dynamic";

const WORKSPACE_ITEMS: { ws: Workspace; label: string; icon: typeof Boxes; shortcut: string }[] = [
  { ws: "model",    label: "Vai a · Modello",    icon: Boxes,           shortcut: "1" },
  { ws: "analysis", label: "Vai a · Analisi",    icon: Cpu,             shortcut: "2" },
  { ws: "results",  label: "Vai a · Risultati",  icon: BarChart3,       shortcut: "3" },
  { ws: "verify",   label: "Vai a · Verifiche",  icon: ShieldCheck,     shortcut: "4" },
  { ws: "io",       label: "Vai a · I/O",        icon: ArrowRightLeft,  shortcut: "5" },
];

export function CommandPalette() {
  const open = useWorkspaceStore((s) => s.paletteOpen);
  const setOpen = useWorkspaceStore((s) => s.setPalette);
  const setWorkspace = useWorkspaceStore((s) => s.setWorkspace);
  const setDialog = useUIStore((s) => s.setOpenDialog);
  const setAnalysisType = useAnalysisStore((s) => s.setAnalysisType);
  const model = useModelStore((s) => s.model);
  const run = useRunAnalysis();

  // Toggle via Ctrl+K / Cmd+K (mantieni anche shortcut esistenti)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(!open);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, setOpen]);

  function go(action: () => void) {
    action();
    setOpen(false);
  }

  function runAnalysis(t: AnalysisType) {
    if (!model) return;
    setAnalysisType(t);
    setWorkspace("results");
    run();
  }

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Comandi"
      className={cn(
        "fixed inset-0 z-40 flex items-start justify-center pt-[10vh]",
        // overlay
        "before:content-[''] before:fixed before:inset-0 before:bg-black/60 before:backdrop-blur-sm before:-z-10",
      )}
    >
      <div className="w-[640px] max-w-[calc(100vw-32px)] bg-bg-elevated border border-border rounded-lg shadow-dialog overflow-hidden animate-slide-up">
        <Command.Input
          placeholder="Cerca comandi… (workspace, analisi, dialog)"
          className={cn(
            "w-full px-4 py-3 bg-bg-elevated border-b border-border",
            "text-sm text-ink placeholder:text-ink-dim",
            "focus:outline-none",
          )}
        />
        <Command.List className="max-h-[60vh] overflow-y-auto p-2">
          <Command.Empty className="px-4 py-6 text-center text-xs text-ink-muted">
            Nessun comando trovato.
          </Command.Empty>

          <Command.Group heading="Workspace" className="text-xs text-ink-muted px-2 pt-2 pb-1 font-medium [&_[cmdk-group-heading]]:py-1">
            {WORKSPACE_ITEMS.map(({ ws, label, icon: Icon, shortcut }) => (
              <Command.Item
                key={ws}
                onSelect={() => go(() => setWorkspace(ws))}
                className="px-3 py-2 rounded text-sm flex items-center gap-2 cursor-pointer text-ink data-[selected=true]:bg-bg-hover"
              >
                <Icon className="h-4 w-4 text-ink-muted" />
                <span className="flex-1">{label}</span>
                <kbd className="text-[10px] bg-bg px-1.5 py-0.5 rounded border border-border text-ink-muted">{shortcut}</kbd>
              </Command.Item>
            ))}
          </Command.Group>

          <Command.Group heading="Azioni" className="text-xs text-ink-muted px-2 pt-3 pb-1 font-medium">
            <Command.Item
              onSelect={() => go(() => setDialog("new"))}
              className="px-3 py-2 rounded text-sm flex items-center gap-2 cursor-pointer text-ink data-[selected=true]:bg-bg-hover"
            >
              <Plus className="h-4 w-4 text-ink-muted" />
              <span className="flex-1">Nuovo modello…</span>
            </Command.Item>
            <Command.Item
              onSelect={() => go(() => setDialog("mesh"))}
              disabled={!model}
              className="px-3 py-2 rounded text-sm flex items-center gap-2 cursor-pointer text-ink data-[disabled=true]:opacity-40 data-[selected=true]:bg-bg-hover"
            >
              <Layers className="h-4 w-4 text-ink-muted" />
              <span className="flex-1">Wizard mesh…</span>
            </Command.Item>
            <Command.Item
              onSelect={() => go(() => setDialog("node"))}
              disabled={!model}
              className="px-3 py-2 rounded text-sm flex items-center gap-2 cursor-pointer text-ink data-[disabled=true]:opacity-40 data-[selected=true]:bg-bg-hover"
            >
              <MousePointerClick className="h-4 w-4 text-ink-muted" />
              <span className="flex-1">Aggiungi nodo…</span>
            </Command.Item>
          </Command.Group>

          <Command.Group heading="Analisi" className="text-xs text-ink-muted px-2 pt-3 pb-1 font-medium">
            {(["static", "modal", "dynamic"] as AnalysisType[]).map((t) => (
              <Command.Item
                key={t}
                onSelect={() => go(() => runAnalysis(t))}
                disabled={!model}
                className="px-3 py-2 rounded text-sm flex items-center gap-2 cursor-pointer text-ink data-[disabled=true]:opacity-40 data-[selected=true]:bg-bg-hover"
              >
                <Play className="h-4 w-4 text-ink-muted" />
                <span className="flex-1">Esegui · {labels[t]}</span>
              </Command.Item>
            ))}
          </Command.Group>

          <Command.Group heading="I/O (in arrivo M6)" className="text-xs text-ink-muted px-2 pt-3 pb-1 font-medium">
            <Command.Item disabled className="px-3 py-2 rounded text-sm flex items-center gap-2 text-ink-dim opacity-50">
              <FileDown className="h-4 w-4" />
              <span className="flex-1">Esporta PDF (server)…</span>
            </Command.Item>
            <Command.Item disabled className="px-3 py-2 rounded text-sm flex items-center gap-2 text-ink-dim opacity-50">
              <FileUp className="h-4 w-4" />
              <span className="flex-1">Importa DXF…</span>
            </Command.Item>
            <Command.Item disabled className="px-3 py-2 rounded text-sm flex items-center gap-2 text-ink-dim opacity-50">
              <HelpCircle className="h-4 w-4" />
              <span className="flex-1">Chiedi a Copilot…</span>
            </Command.Item>
          </Command.Group>
        </Command.List>

        <div className="px-3 py-2 border-t border-border bg-bg-panel/50 flex items-center gap-3 text-[11px] text-ink-dim">
          <span><kbd className="bg-bg px-1 py-0.5 rounded border border-border">↑↓</kbd> naviga</span>
          <span><kbd className="bg-bg px-1 py-0.5 rounded border border-border">↵</kbd> esegui</span>
          <span><kbd className="bg-bg px-1 py-0.5 rounded border border-border">Esc</kbd> chiudi</span>
          <span className="ml-auto"><kbd className="bg-bg px-1 py-0.5 rounded border border-border">Ctrl K</kbd> toggle</span>
        </div>
      </div>
    </Command.Dialog>
  );
}

const labels: Record<AnalysisType, string> = {
  static: "Statica",
  modal: "Modale",
  dynamic: "Dinamica",
};
