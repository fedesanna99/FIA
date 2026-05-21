/**
 * Command Palette (alpha.21 — Sprint 4 G6).
 *
 * Refactor da hard-coded lista a **registry-driven** (`lib/paletteItems.ts`).
 * 6 sezioni mockup-aligned con icon, alias fuzzy, shortcut, descrizione.
 * Quando un utente digita una parola chiave, `cmdk` la matcha contro
 * label + aliases (concatenati nel value).
 *
 * UX:
 *  - Ctrl+K / Cmd+K toggle (gestito anche in useKeyboardShortcuts)
 *  - Esc chiude
 *  - Frecce e Enter navigano/eseguono
 *  - "Suggeriti" sezione contestuale (top 3 in base a workspace)
 */
import { Command } from "cmdk";
import { useEffect, useMemo } from "react";
import { useWorkspaceStore } from "../../store/workspaceStore";
import { useRightRailStore } from "../../store/rightRailStore";
import { useLeftRailStore } from "../../store/leftRailStore";
import { useUIStore } from "../../store/uiStore";
import { useAnalysisStore } from "../../store/analysisStore";
import { useModelStore } from "../../store/modelStore";
import { useResultsStore } from "../../store/resultsStore";
import { useThemeStore } from "../../store/themeStore";
import { useAuthStore } from "../../store/authStore";
import { useRunAnalysis } from "../../hooks/useAnalysis";
import { useNavigationCommands } from "../../hooks/useNavigationCommands";
import { useSelectionStore } from "../../store/selectionStore";
import { useWizardStore, type WizardKind } from "../../store/wizardStore";
import { toast } from "../../store/toastStore";
import {
  exportModelJson, exportResultsJson,
  exportDisplacementsCSV, exportModesCSV,
} from "../../utils/export";
import { generateReport, viewportCanvasDataUrl } from "../../utils/reportPdf";
import {
  PALETTE_ITEMS, SECTION_LABELS, SECTION_ORDER,
  type PaletteItem, type PaletteSection,
} from "../../lib/paletteItems";
import { cn } from "../ui/cn";


export function CommandPalette() {
  const open = useWorkspaceStore((s) => s.paletteOpen);
  const setOpen = useWorkspaceStore((s) => s.setPalette);
  const setWorkspace = useWorkspaceStore((s) => s.setWorkspace);
  const workspace = useWorkspaceStore((s) => s.workspace);
  const setHelp = useWorkspaceStore((s) => s.setHelp);
  const setDialog = useUIStore((s) => s.setOpenDialog);
  const setAnalysisType = useAnalysisStore((s) => s.setAnalysisType);
  const model = useModelStore((s) => s.model);
  const setTheme = useThemeStore((s) => s.setMode);
  const authLogout = useAuthStore((s) => s.logout);
  const setOpenSection = useRightRailStore((s) => s.open);
  const run = useRunAnalysis();

  // v1.5 follow-up: voci dinamiche goto-node/element generate dal modello attivo
  const navItems = useNavigationCommands();

  // Ctrl+K / Cmd+K toggle (mantieni shortcut esistenti)
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

  // ── Dispatcher azioni ────────────────────────────────────────────────────
  function execute(item: PaletteItem): void {
    if (item.needsModel && !model) return;
    if (item.soon) return;

    switch (item.actionKind) {
      case "workspace": {
        // alpha.31 hotfix: oltre allo store legacy serve aprire il LeftSlidePanel
        // (model/analysis/verify/io) via leftRailStore, altrimenti l'utente non
        // vede mai il pannello laterale (mappa setWorkspace -> visibilita').
        const target = item.payload as Parameters<typeof setWorkspace>[0];
        setWorkspace(target);
        if (target !== "docs") {
          useLeftRailStore.getState().open(target);
        }
        break;
      }
      case "right-panel":
        setOpenSection(item.payload as Parameters<typeof setOpenSection>[0]);
        break;
      case "dialog":
        setDialog(item.payload as Parameters<typeof setDialog>[0]);
        break;
      case "theme":
        setTheme(item.payload as Parameters<typeof setTheme>[0]);
        break;
      case "run-analysis":
        if (!model) return;
        setAnalysisType(item.payload as Parameters<typeof setAnalysisType>[0]);
        setWorkspace("results");
        run();
        break;
      case "external-link":
        window.open((item.payload as { url: string }).url, "_blank", "noopener");
        break;
      case "openHelp":
        setHelp(true);
        break;
      case "openAccount":
        // Apre AccountDialog via custom event — il componente AccountDialog
        // listener vivra' in TopBar (handler centralizzato). Per ora usiamo
        // un evento window broadcast: piu' semplice del threading prop chain.
        window.dispatchEvent(new CustomEvent("feapro:open-account"));
        break;
      case "openLocation":
        window.dispatchEvent(new CustomEvent("feapro:open-location"));
        break;
      case "openAuth":
        window.dispatchEvent(new CustomEvent("feapro:open-auth"));
        break;
      case "openExport":
        // alpha.31 hotfix: setWorkspace("io") da solo non monta nulla — il
        // LeftSlidePanel legge da leftRailStore.openSection. Apriamo
        // esplicitamente la sezione "io" cosi' compare il pannello I/O.
        setWorkspace("io");
        useLeftRailStore.getState().open("io");
        break;
      case "logout":
        authLogout();
        break;
      case "open-wizard": {
        // v1.5 Task 34 follow-up: hub generico via wizardStore.
        // Il dispatcher in App.tsx instrada al meccanismo concreto
        // (uiStore.setOpenDialog / custom event / toast soon) e poi
        // resetta lo stato. Per la voce sismica-th l'evento viene
        // intercettato da SeismicTHPanel.tsx.
        const { wizard, ...rest } = (item.payload ?? {}) as {
          wizard?: WizardKind;
          [k: string]: unknown;
        };
        if (!wizard) break;
        useWizardStore.getState().open(wizard, rest);
        break;
      }
      case "open-import-wizard": {
        // v1.5 Task 29: apre ImportWizard via custom event globale (gestito
        // in App.tsx). Payload opzionale { source: "dxf"|"ifc"|"json" }.
        const payload = (item.payload ?? {}) as { source?: string };
        window.dispatchEvent(
          new CustomEvent("feapro:open-import-wizard", {
            detail: payload.source ? { source: payload.source } : undefined,
          }),
        );
        break;
      }
      case "apply-material": {
        // v1.5 Task 34: applica materiale alla selezione del modelStore.
        // Se nulla e' selezionato, ricorda all'utente di selezionare prima.
        const sel = useModelStore.getState().selectedElementIds;
        const matId = (item.payload as { materialId: string }).materialId;
        if (sel.size === 0) {
          toast("info", `Seleziona elementi prima di applicare ${matId}.`);
        } else {
          // TODO v1.5+: chiama materialsApi.applyToElements(modelId, Array.from(sel), matId).
          toast("success", `Materiale ${matId} marcato per ${sel.size} elementi (mutation API in arrivo).`);
        }
        break;
      }
      case "apply-section": {
        const sel = useModelStore.getState().selectedElementIds;
        const secId = (item.payload as { sectionId: string }).sectionId;
        if (sel.size === 0) {
          toast("info", `Seleziona elementi prima di applicare ${secId}.`);
        } else {
          toast("success", `Sezione ${secId} marcata per ${sel.size} elementi (mutation API in arrivo).`);
        }
        break;
      }
      case "toggle-view": {
        // v1.5.1 follow-up: i flag overlay vivono in due store:
        //   - analysisStore: grid/loads/constraints/labels/diagrams/principals
        //   - resultsStore:  deformed/isosurfaces/stress-colormap
        // 'cycleViewportMode' cicla wireframe → solid → transparent.
        const flag = (item.payload as { flag: string }).flag;
        const a = useAnalysisStore.getState();
        const r = useResultsStore.getState();
        switch (flag) {
          // analysisStore (geometry overlays)
          case "showGrid":         a.toggleGrid(); break;
          case "showLoads":        a.toggleLoads(); break;
          case "showConstraints":  a.toggleConstraints(); break;
          case "showNodeLabels":   a.toggleNodeLabels(); break;
          case "showDiagrams":     a.toggleDiagrams(); break;
          case "showPrincipals":   a.togglePrincipals(); break;
          // resultsStore (post-processing overlays)
          case "showDeformed":     r.toggleDeformed(); break;
          case "showStressColormap": r.toggleStressColormap(); break;
          case "showIsosurfaces":  r.toggleIsosurfaces(); break;
          // viewportMode tri-state cycle
          case "cycleViewportMode": {
            const next: typeof a.viewportMode =
              a.viewportMode === "wireframe" ? "solid" :
              a.viewportMode === "solid"     ? "transparent" :
                                                "wireframe";
            a.setViewportMode(next);
            toast("info", `Vista: ${next}`, 1500);
            break;
          }
          default:
            toast("info", `Toggle "${flag}" non riconosciuto.`);
        }
        break;
      }
      case "quick-export": {
        // v1.5 Task 34: shortcut export rapido. Riusa utils/export.ts.
        const m = useModelStore.getState().model;
        if (!m) { toast("error", "Nessun modello caricato."); break; }
        const r = useResultsStore.getState();
        const payload = item.payload as { format: string; scope?: string };
        try {
          switch (payload.format) {
            case "pdf": {
              const viewportPng = viewportCanvasDataUrl();
              void generateReport({
                model: m,
                staticResults: r.staticResults,
                modalResults: r.modalResults,
                viewportPng,
              });
              break;
            }
            case "xlsx":
              if (r.staticResults) exportDisplacementsCSV(m, r.staticResults);
              if (r.modalResults) exportModesCSV(m, r.modalResults);
              toast("success", "Export Excel: scaricati CSV piatti.");
              break;
            case "csv-nodes":
              if (!r.staticResults) { toast("error", "Servono risultati statica."); break; }
              exportDisplacementsCSV(m, r.staticResults);
              break;
            case "csv-modes":
              if (!r.modalResults) { toast("error", "Servono risultati modale."); break; }
              exportModesCSV(m, r.modalResults);
              break;
            case "json":
              exportModelJson(m);
              if (r.staticResults) exportResultsJson(m.name, r.staticResults);
              break;
            case "dxf":
              toast("info", "Export DXF: usa il pannello Tools → Esporta.");
              break;
            default:
              toast("info", `Format "${payload.format}" non riconosciuto.`);
          }
        } catch (e) {
          toast("error", `Errore export: ${(e as Error).message}`);
        }
        break;
      }
      case "goto-node": {
        // v1.5 follow-up: focus contestuale su un nodo specifico.
        // 1) modelStore.selectNode aggiorna il highlight viewport (single-set)
        // 2) selectionStore.selectNode triggera NodeDetail nel RightPanel inspect
        // 3) RightRail aperto sulla sezione "inspect"
        // 4) Workspace switch a "model" se l'utente era altrove (cosi' vede il viewport)
        const { nodeId } = item.payload as { nodeId: number };
        const ms = useModelStore.getState();
        if (!ms.model) break;
        const exists = ms.model.nodes.some((n) => n.id === nodeId);
        if (!exists) {
          toast("error", `Nodo N${nodeId} non trovato nel modello.`);
          break;
        }
        // Selezione singola (no additive): replace il set corrente
        ms.clearSelection();
        ms.selectNode(nodeId, false);
        useSelectionStore.getState().selectNode(nodeId);
        useRightRailStore.getState().open("inspect");
        useWorkspaceStore.getState().openRightPanel("inspect");
        toast("info", `Nodo N${nodeId} selezionato.`, 1500);
        break;
      }
      case "goto-element": {
        // Stessa logica di goto-node ma su elemento.
        const { elementId } = item.payload as { elementId: number };
        const ms = useModelStore.getState();
        if (!ms.model) break;
        const exists = ms.model.elements.some((e) => e.id === elementId);
        if (!exists) {
          toast("error", `Elemento E${elementId} non trovato nel modello.`);
          break;
        }
        ms.clearSelection();
        ms.selectElement(elementId, false);
        useSelectionStore.getState().selectElement(elementId);
        useRightRailStore.getState().open("inspect");
        useWorkspaceStore.getState().openRightPanel("inspect");
        toast("info", `Elemento E${elementId} selezionato.`, 1500);
        break;
      }
      case "focus-toggle": {
        // v1.5 Task 33: toggle modalita' focus dalla palette (oltre a Shift+Space e F).
        const ws = useWorkspaceStore.getState();
        if (ws.isEmptyState) {
          ws.exitEmptyState();
        } else {
          useLeftRailStore.getState().close();
          ws.enterEmptyState();
          void import("../../store/rightRailStore").then((m) =>
            m.useRightRailStore.getState().close(),
          );
        }
        break;
      }
      case "togglePalette":
      default:
        break;
    }
    setOpen(false);
  }

  // ── Suggeriti contestuali (top 3 in base al workspace) ───────────────────
  const favorites = useMemo<PaletteItem[]>(() => {
    const map: Partial<Record<typeof workspace, string[]>> = {
      model:    ["open-mesh-wizard", "add-node", "add-load"],
      analysis: ["run-static", "run-modal", "run-dynamic"],
      results:  ["rp-inspect", "rp-view", "open-export"],
      verify:   ["ws-results", "rp-inspect", "help-validation"],
      io:       ["open-export", "open-location", "concept-wind"],
      docs:     ["help-overview", "help-shortcuts", "help-api-docs"],
    };
    const ids = map[workspace] ?? [];
    return ids
      .map((id) => PALETTE_ITEMS.find((it) => it.id === id))
      .filter(Boolean) as PaletteItem[];
  }, [workspace]);

  // ── Grouping per sezione (escluso favorites che e' costruito sopra) ──────
  // v1.5 follow-up: alle voci statiche concatenima quelle dinamiche
  // (goto-node / goto-element) prodotte da useNavigationCommands().
  const allItems = useMemo<PaletteItem[]>(
    () => [...PALETTE_ITEMS, ...navItems],
    [navItems],
  );
  const grouped = useMemo(() => {
    const out = new Map<PaletteSection, PaletteItem[]>();
    for (const it of allItems) {
      const arr = out.get(it.section) ?? [];
      arr.push(it);
      out.set(it.section, arr);
    }
    return out;
  }, [allItems]);

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Comandi"
      className={cn(
        "fixed inset-0 z-40 flex items-start justify-center pt-[10vh]",
        "before:content-[''] before:fixed before:inset-0 before:bg-black/60 before:backdrop-blur-sm before:-z-10",
      )}
    >
      <div className="w-[720px] max-w-[calc(100vw-32px)] bg-bg-elevated border border-border rounded-lg shadow-dialog overflow-hidden animate-slide-up">
        <Command.Input
          placeholder={`Cerca tra ${allItems.length} comandi…  (workspace, analisi, theme, location, n42, e17)`}
          className={cn(
            "w-full px-4 py-3 bg-bg-elevated border-b border-border",
            "text-sm text-ink placeholder:text-ink-dim font-display",
            "focus:outline-none",
          )}
          data-testid="palette-input"
        />
        <Command.List className="max-h-[60vh] overflow-y-auto p-2">
          <Command.Empty className="px-4 py-6 text-center text-xs text-ink-muted">
            Nessun comando trovato. Prova "model", "run", "theme", "help"…
          </Command.Empty>

          {/* Suggeriti contestuali */}
          {favorites.length > 0 && (
            <Command.Group
              heading={SECTION_LABELS.favorites}
              className="text-xs text-ink-muted px-2 pt-2 pb-1 font-medium [&_[cmdk-group-heading]]:py-1"
            >
              {favorites.map((item) => <Row key={`fav-${item.id}`} item={item} onSelect={() => execute(item)} disabled={item.needsModel && !model} />)}
            </Command.Group>
          )}

          {/* Sezioni in ordine */}
          {SECTION_ORDER.filter((s) => s !== "favorites").map((section) => {
            const items = grouped.get(section) ?? [];
            if (items.length === 0) return null;
            return (
              <Command.Group
                key={section}
                heading={`${SECTION_LABELS[section]} · ${items.length}`}
                className="text-xs text-ink-muted px-2 pt-3 pb-1 font-medium"
              >
                {items.map((item) => <Row key={item.id} item={item} onSelect={() => execute(item)} disabled={item.needsModel && !model} />)}
              </Command.Group>
            );
          })}
        </Command.List>

        <div className="px-3 py-2 border-t border-border bg-bg-panel/50 flex items-center gap-3 text-[11px] text-ink-dim">
          <span><kbd className="kbd">↑↓</kbd> naviga</span>
          <span><kbd className="kbd">↵</kbd> esegui</span>
          <span><kbd className="kbd">Esc</kbd> chiudi</span>
          <span className="ml-auto"><kbd className="kbd">Ctrl K</kbd> toggle</span>
        </div>
      </div>
    </Command.Dialog>
  );
}


/** Single palette row — separato per leggibilita'. */
function Row({
  item, onSelect, disabled,
}: {
  item: PaletteItem;
  onSelect: () => void;
  disabled?: boolean;
}) {
  const Icon = item.icon;
  // Aliases concatenati nel `value` per cmdk fuzzy match
  const matchValue = [item.label, item.description, ...(item.aliases ?? [])].filter(Boolean).join(" ");

  return (
    <Command.Item
      value={matchValue}
      onSelect={() => !disabled && !item.soon && onSelect()}
      disabled={disabled || item.soon}
      data-testid={`palette-item-${item.id}`}
      className="px-3 py-2 rounded text-sm flex items-center gap-2 cursor-pointer text-ink data-[selected=true]:bg-bg-hover data-[disabled=true]:opacity-40 data-[disabled=true]:cursor-not-allowed"
    >
      {Icon && <Icon className="h-4 w-4 text-ink-muted flex-shrink-0" strokeWidth={1.8} />}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="truncate">{item.label}</span>
          {item.soon && <span className="chip chip-purple text-[9px]">soon</span>}
          {item.group && <span className="text-[10px] text-ink-dim ml-1">· {item.group}</span>}
        </div>
        {item.description && (
          <div className="text-[11px] text-ink-muted truncate">{item.description}</div>
        )}
      </div>
      {item.shortcut && (
        <kbd className="kbd flex-shrink-0">{item.shortcut}</kbd>
      )}
    </Command.Item>
  );
}
