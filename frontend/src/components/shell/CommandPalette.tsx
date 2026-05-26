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
import { useQueryClient } from "@tanstack/react-query";

import { modelsApi } from "../../api/client";
import { useWorkspaceStore } from "../../store/workspaceStore";
import { useRightRailStore } from "../../store/rightRailStore";
import { useLeftRailStore } from "../../store/leftRailStore";
import { useUIStore } from "../../store/uiStore";
import { useAnalysisStore } from "../../store/analysisStore";
import type { ViewPreset } from "../../store/analysisStore";
import { useModelStore } from "../../store/modelStore";
import { useResultsStore } from "../../store/resultsStore";
import { useThemeStore } from "../../store/themeStore";
import { useAuthStore } from "../../store/authStore";
import { useRunAnalysis } from "../../hooks/useAnalysis";
import { useModalBackButton } from "../../hooks/useModalBackButton";
import { useNavigationCommands } from "../../hooks/useNavigationCommands";
import { useSelectionStore } from "../../store/selectionStore";
import { useWizardStore, type WizardKind } from "../../store/wizardStore";
import { toast } from "../../store/toastStore";
import { viewportCanvasDataUrl } from "../../utils/reportPdf";
import { quickExport } from "../../lib/quickExport";
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
  const qc = useQueryClient();

  // v1.5 follow-up: voci dinamiche goto-node/element generate dal modello attivo
  const navItems = useNavigationCommands();

  // v1.6 S0 · B08: il back hardware mobile chiude la palette invece di
  // navigare via dalla pagina.
  useModalBackButton(open, () => setOpen(false));

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
      case "tools-view": {
        const view = item.payload as string;
        setOpenSection("tools");
        window.setTimeout(() => {
          window.dispatchEvent(new CustomEvent("feapro:tools-view", { detail: { view } }));
        }, 0);
        break;
      }
      case "dialog":
        setDialog(item.payload as Parameters<typeof setDialog>[0]);
        break;
      case "theme":
        setTheme(item.payload as Parameters<typeof setTheme>[0]);
        break;
      case "run-analysis":
        if (!model) return;
        setAnalysisType(item.payload as Parameters<typeof setAnalysisType>[0]);
        // v1.5.2 Task 35: workspace "results" rimosso. Apriamo direttamente
        // l'Inspect del RightRail dove ora vivono i risultati post-analisi.
        setOpenSection("inspect");
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
        // v2.1.4 auth-gate: legacy no-op. Login obbligatorio gestito dall'
        // AuthGate al boot — niente piu' AuthDialog. Manteniamo il case per
        // evitare TS exhaustive errors finche' il tipo non viene rimosso.
        break;
      case "openExport":
        // v1.5.2 Task 35: il pannello I/O legacy e' stato rimosso. L'export
        // vive ora nel rail destro "Tools" (ExportView con 5 rows PDF/XLSX/
        // CSV/JSON). Lo apriamo direttamente.
        setOpenSection("tools");
        break;
      case "logout":
        authLogout();
        break;
      case "open-template-gallery":
        // v1.6 S0 B01: galleria dei modelli precaricati (event globale,
        // mount in App.tsx).
        window.dispatchEvent(new Event("feapro:open-template-gallery"));
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
        // v2.1.9 audit-fix B5: ora la mutation è REALE.
        // Chiama modelsApi.updateElement per ogni elemento selezionato,
        // aggiorna lo store locale + invalida la cache React Query.
        const ms = useModelStore.getState();
        const sel = ms.selectedElementIds;
        const m = ms.model;
        const matId = (item.payload as { materialId: string }).materialId;
        if (!m) { toast("info", "Apri un modello per applicare materiali."); break; }
        if (sel.size === 0) {
          toast("info", `Seleziona elementi prima di applicare ${matId}.`);
          break;
        }
        void applyMaterialToSelection(m.id, m.elements, sel, matId, qc);
        break;
      }
      case "apply-section": {
        // v2.1.9 audit-fix B5: stessa logica per le sezioni.
        const ms = useModelStore.getState();
        const sel = ms.selectedElementIds;
        const m = ms.model;
        const secId = (item.payload as { sectionId: string }).sectionId;
        if (!m) { toast("info", "Apri un modello per applicare sezioni."); break; }
        if (sel.size === 0) {
          toast("info", `Seleziona elementi prima di applicare ${secId}.`);
          break;
        }
        void applySectionToSelection(m.id, m.elements, sel, secId, qc);
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
      case "view-preset": {
        const preset = item.payload as Exclude<ViewPreset, "custom">;
        useAnalysisStore.getState().applyViewPreset(preset);
        useRightRailStore.getState().open("view");
        toast("info", `Vista preset: ${preset}`, 1500);
        break;
      }
      case "quick-export": {
        // v2.5.3 fix bug #2: handler estratto in `lib/quickExport.ts` per
        // testabilità + lazy code-split di SheetJS (xlsx). Toast feedback per
        // PDF (prima silente) + xlsx ora usa exportModelToXlsx multi-sheet
        // invece di CSV piatti (codice obsoleto).
        const m = useModelStore.getState().model;
        if (!m) { toast("error", "Nessun modello caricato."); break; }
        const r = useResultsStore.getState();
        const payload = item.payload as { format: string; scope?: string };
        void quickExport(
          payload,
          m,
          { staticResults: r.staticResults, modalResults: r.modalResults },
          { toast, getViewportPng: viewportCanvasDataUrl },
        );
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
          useRightRailStore.getState().close();
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
  // v1.5.2 Task 35: rimossi suggerimenti per "results"/"io" insieme al
  // workspace legacy. Inspect e Tools restano raggiungibili da palette via
  // alias ("risultati" → rp-inspect, "import"/"export" → rp-tools).
  const favorites = useMemo<PaletteItem[]>(() => {
    const map: Partial<Record<typeof workspace, string[]>> = {
      model:    ["open-mesh-wizard", "add-node", "add-load"],
      analysis: ["run-static", "run-modal", "run-dynamic"],
      verify:   ["rp-inspect", "help-validation", "open-export"],
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
      className="fixed inset-0 z-40 flex items-start justify-center pt-[10vh]"
    >
      {/*
       * v1.6 S0 · B02: backdrop reale (era ::before pseudo-element non-DOM
       * → click outside intrappolava l'utente). Ora un div con onClick che
       * setta open=false. Il container interno usa stopPropagation per
       * impedire che il click su una riga buchi fino al backdrop.
       */}
      <div
        className="fixed inset-0 -z-10 bg-black/50 animate-fade-in"
        onClick={() => setOpen(false)}
        aria-hidden="true"
        data-testid="palette-backdrop"
      />
      <div
        className="w-[760px] max-w-[calc(100vw-32px)] bg-bg-elevated border border-border-light shadow-dialog overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <Command.Input
          placeholder={`Cerca tra ${allItems.length} comandi · workspace · analisi · theme · location · n42 · e17`}
          className={cn(
            "w-full px-4 py-3.5 bg-bg-elevated border-b border-border",
            "text-base text-ink placeholder:text-ink-3 font-display",
            "focus:outline-none",
          )}
          data-testid="palette-input"
        />
        <Command.List className="max-h-[62vh] overflow-y-auto p-1.5">
          <Command.Empty className="px-4 py-8 text-center">
            <div className="font-mono text-[10px] uppercase tracking-wide-2 text-ink-3 font-semibold mb-1">
              Nessun comando trovato
            </div>
            <div className="text-sm text-ink-2">
              Prova "model", "run", "theme", "help"…
            </div>
          </Command.Empty>

          {/* Suggeriti contestuali */}
          {favorites.length > 0 && (
            <Command.Group
              heading={SECTION_LABELS.favorites}
              className="font-mono text-[10px] uppercase tracking-wide-2 text-ink-3 px-2 pt-2 pb-1 font-semibold [&_[cmdk-group-heading]]:py-1"
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
                className="font-mono text-[10px] uppercase tracking-wide-2 text-ink-3 px-2 pt-3 pb-1 font-semibold"
              >
                {items.map((item) => <Row key={item.id} item={item} onSelect={() => execute(item)} disabled={item.needsModel && !model} />)}
              </Command.Group>
            );
          })}
        </Command.List>

        <div className="px-3 py-2 border-t border-border bg-bg-panel flex items-center gap-3 font-mono text-[10px] uppercase tracking-wide-1 text-ink-3">
          <span className="inline-flex items-center gap-1"><kbd className="bg-bg-hover border border-border-light text-ink-2 px-1 py-0.5 font-medium normal-case tracking-normal">↑↓</kbd> naviga</span>
          <span className="inline-flex items-center gap-1"><kbd className="bg-bg-hover border border-border-light text-ink-2 px-1 py-0.5 font-medium normal-case tracking-normal">↵</kbd> esegui</span>
          <span className="inline-flex items-center gap-1"><kbd className="bg-bg-hover border border-border-light text-ink-2 px-1 py-0.5 font-medium normal-case tracking-normal">Esc</kbd> chiudi</span>
          <span className="ml-auto inline-flex items-center gap-1"><kbd className="bg-bg-hover border border-border-light text-ink-2 px-1 py-0.5 font-medium normal-case tracking-normal">⌘ K</kbd> toggle</span>
        </div>
      </div>
    </Command.Dialog>
  );
}


/**
 * v2.1.9 audit-fix B5 — applica materiale/sezione alla selezione corrente.
 *
 * Chiama `modelsApi.updateElement` per ogni elemento selezionato (in parallelo
 * tramite `Promise.allSettled`), aggiorna lo store locale via `updateElement`
 * e invalida la React Query cache così le UI dipendenti (ResultsOverviewCard,
 * VerifyChecksLive, ecc.) si rinfrescano. Errori parziali sono raccolti.
 */
async function applyMaterialToSelection(
  modelId: string,
  elements: import("../../types/model").Element[],
  selection: Set<number>,
  materialId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  qc: any,
): Promise<void> {
  return applyPropertyToSelection(modelId, elements, selection, qc, (el) => ({
    ...el, material_id: materialId,
  }), `Materiale ${materialId}`);
}

async function applySectionToSelection(
  modelId: string,
  elements: import("../../types/model").Element[],
  selection: Set<number>,
  sectionId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  qc: any,
): Promise<void> {
  return applyPropertyToSelection(modelId, elements, selection, qc, (el) => ({
    ...el, section_id: sectionId,
  }), `Sezione ${sectionId}`);
}

async function applyPropertyToSelection(
  modelId: string,
  elements: import("../../types/model").Element[],
  selection: Set<number>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  qc: any,
  mapper: (el: import("../../types/model").Element) => import("../../types/model").Element,
  label: string,
): Promise<void> {
  const targets = elements.filter((e) => selection.has(e.id));
  if (targets.length === 0) return;
  const updateLocal = useModelStore.getState().updateElement;
  const results = await Promise.allSettled(
    targets.map(async (el) => {
      const updated = await modelsApi.updateElement(modelId, el.id, mapper(el));
      updateLocal(el.id, updated);
      return updated;
    }),
  );
  const ok = results.filter((r) => r.status === "fulfilled").length;
  const fail = results.length - ok;
  qc.invalidateQueries({ queryKey: ["model", modelId] });
  qc.invalidateQueries({ queryKey: ["models"] });
  if (fail === 0) {
    toast("success", `${label} applicato a ${ok} elementi.`);
  } else if (ok > 0) {
    toast("warning", `${label}: ${ok} ok · ${fail} falliti.`);
  } else {
    toast("error", `Impossibile applicare ${label} (${fail} errori).`);
  }
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
      className="px-3 py-2 text-sm flex items-center gap-2.5 cursor-pointer text-ink data-[selected=true]:bg-bg-hover data-[selected=true]:border-l-2 data-[selected=true]:border-accent data-[disabled=true]:opacity-40 data-[disabled=true]:cursor-not-allowed transition-colors"
    >
      {Icon && <Icon className="h-4 w-4 text-ink-3 flex-shrink-0" strokeWidth={1.8} />}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-ink font-medium">{item.label}</span>
          {item.soon && (
            <span className="font-mono text-[9px] uppercase tracking-wide-1 bg-bg-purple text-purple border border-purple/30 px-1 py-0.5 font-semibold">
              soon
            </span>
          )}
          {item.group && (
            <span className="font-mono text-[10px] uppercase tracking-wide-1 text-ink-3 ml-1">· {item.group}</span>
          )}
        </div>
        {item.description && (
          <div className="text-[11px] text-ink-3 truncate mt-0.5">{item.description}</div>
        )}
      </div>
      {item.shortcut && (
        <kbd className="font-mono text-[10px] uppercase tracking-wide-1 bg-bg-hover border border-border-light text-ink-2 px-1 py-0.5 font-medium flex-shrink-0">
          {item.shortcut}
        </kbd>
      )}
    </Command.Item>
  );
}
