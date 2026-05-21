/**
 * TopBar — barra superiore 48px (alpha.18 Sprint 4 G3).
 *
 * Layout aggiornato col mockup v1.3:
 *   [logo · version]
 *   [breadcrumb model › workspace]      (≥ lg)
 *   [model picker · CRUD · Esegui]
 *   [── flex spacer ──]
 *   [search-bar Ctrl+K · AI Copilot · collab avatar · Loads · Account · Login · Export]
 *
 * Mantiene tutta la logica precedente: TanStack Query, Auth verify
 * al mount, run analysis, dialog modali.
 */
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Play,
  Check,
  Undo2,
  Redo2,
  Bell,
} from "lucide-react";
import type { FEAModel } from "../../types/model";
import { modelsApi } from "../../api/client";
import { useAnalysisStore } from "../../store/analysisStore";
import { useRunAnalysis } from "../../hooks/useAnalysis";
import { useModelStore } from "../../store/modelStore";
import { useModelHistory } from "../../store/historyStore";
import { NewModelDialog } from "../dialogs/NewModelDialog";
import { EditModelDialog } from "../dialogs/EditModelDialog";
import { AccountDialog } from "../dialogs/AccountDialog";
import { LocationPickerDialog } from "../dialogs/LocationPickerDialog";
import { AuthDialog } from "../dialogs/AuthDialog";
import { useClimateStore } from "../../store/climateStore";
import { useAuthStore } from "../../store/authStore";
import { toast, useToastStore } from "../../store/toastStore";
import { APP_VERSION } from "../../lib/version";
import { ModelMenu } from "./topbar/ModelMenu";
import { GlobalSearch } from "./topbar/GlobalSearch";
import { AICopilotButton } from "./topbar/AICopilotButton";
import { AvatarMenu } from "./topbar/AvatarMenu";
import { Button } from "../ui/Button";
import { Tooltip } from "../ui/Tooltip";
import { cn } from "../ui/cn";

interface Props {
  models: FEAModel[];
  activeId: string | null;
  onSelect: (id: string | null) => void;
}

type AnalysisType = "static" | "modal" | "dynamic";

const ANALYSIS_LABELS: Record<AnalysisType, string> = {
  static:   "Statica",
  modal:    "Modale",
  dynamic:  "Dinamica",
};

export function TopBar({ models, activeId, onSelect }: Props) {
  const { analysisType, isRunning } = useAnalysisStore();
  const run = useRunAnalysis();
  const model = useModelStore((s) => s.model);
  const lastSavedAt = useModelStore((s) => s.lastSavedAt);
  // alpha.30: undo/redo reattivi via historyStore. Il wiring del push
  // automatico al modelStore verra' aggiunto in un task successivo: per
  // ora i bottoni restano disabled finche' canUndo/canRedo non diventano
  // veri (l'API e' pronta lato store).
  const canUndo = useModelHistory((s) => s.past.length > 0);
  const canRedo = useModelHistory((s) => s.future.length > 0);
  // alpha.30: placeholder per il bell counter. toastStore non ha ancora
  // il concetto di read/unread: per ora usiamo la length dei toast attivi
  // (che auto-decade con ttlMs). Verra' sostituito da un notificationsStore
  // dedicato quando arriverà la persistenza side-bar.
  const unreadCount = useToastStore((s) => s.toasts.length);
  const [newOpen, setNewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const setClimateBundle = useClimateStore((s) => s.setBundle);
  const authToken = useAuthStore((s) => s.token);
  const authUser = useAuthStore((s) => s.user);
  const verifyToken = useAuthStore((s) => s.verifyToken);
  const qc = useQueryClient();

  // Al mount: se c'e' un token salvato, valida lato server (se invalido → logout)
  useEffect(() => {
    if (authToken && !authUser) {
      verifyToken();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // alpha.21: listener custom events dalla Command Palette per aprire i dialog
  // gestiti dal TopBar (account/location/auth). Evita prop drilling.
  useEffect(() => {
    const openAcc = () => setAccountOpen(true);
    const openLoc = () => setLocationOpen(true);
    const openAuthFn = () => setAuthOpen(true);
    const openNew = () => setNewOpen(true);
    window.addEventListener("feapro:open-account", openAcc);
    window.addEventListener("feapro:open-location", openLoc);
    window.addEventListener("feapro:open-auth", openAuthFn);
    window.addEventListener("feapro:open-new-model", openNew);
    return () => {
      window.removeEventListener("feapro:open-account", openAcc);
      window.removeEventListener("feapro:open-location", openLoc);
      window.removeEventListener("feapro:open-auth", openAuthFn);
      window.removeEventListener("feapro:open-new-model", openNew);
    };
  }, []);

  const dup = useMutation({
    mutationFn: (id: string) => modelsApi.duplicate(id),
    onSuccess: (m) => {
      qc.invalidateQueries({ queryKey: ["models"] });
      onSelect(m.id);
    },
  });

  // alpha.31: delete model con conferma window.confirm. Se confermato,
  // reset activeId → la Dashboard riappare.
  const del = useMutation({
    mutationFn: (id: string) => modelsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["models"] });
      onSelect(null);
      toast("info", "Modello eliminato.");
    },
    onError: (e) => toast("error", `Errore eliminazione: ${(e as Error).message}`),
  });

  return (
    <header className="h-12 flex-shrink-0 border-b border-border bg-bg-panel flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 min-w-0 overflow-hidden">
      {/* Logo + version */}
      <div className="flex items-center gap-2 pr-2 border-r border-border h-7 flex-shrink-0">
        <div className="w-6 h-6 rounded bg-accent/15 border border-accent/40 flex items-center justify-center">
          <span className="text-accent text-xs font-bold">F</span>
        </div>
        <span className="font-semibold text-sm text-ink hidden sm:inline font-display">FEA Pro</span>
        <span className="text-[10px] font-mono text-ink-dim hidden md:inline">{APP_VERSION}</span>
      </div>

      {/* Model menu — single entry point per Duplica/Modifica/Switch/New/Delete.
          Sostituisce Breadcrumb + model picker + CRUD + select tipo analisi
          (alpha.31 — Progressive Disclosure Task 16). */}
      <ModelMenu
        modelName={model?.name ?? null}
        hasModel={!!activeId}
        isDuplicating={dup.isPending}
        isDeleting={del.isPending}
        onDuplicate={() => activeId && dup.mutate(activeId)}
        onEdit={() => setEditOpen(true)}
        onSwitch={() => onSelect(null)}
        onNew={() => setNewOpen(true)}
        onDelete={() => {
          if (!activeId) return;
          if (window.confirm(`Eliminare "${model?.name ?? "modello"}"? Operazione non reversibile.`)) {
            del.mutate(activeId);
          }
        }}
      />

      {/* Save status chip — visibile quando il modello e' stato salvato */}
      {lastSavedAt && (
        <div className="hidden md:flex items-center gap-1 text-[11px] bg-bg-success border border-success/30 text-success px-2 py-0.5 rounded-sm flex-shrink-0">
          <Check className="w-3 h-3" />
          Salvato {lastSavedAt.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
        </div>
      )}

      {/* Run analysis — tipo analisi scelto nel SolvePanel, qui solo il bottone */}
      <div className="flex items-center gap-1.5 sm:gap-2 pl-2 md:pl-3 border-l border-border ml-1 flex-shrink-0">
        <Tooltip content={`Esegui ${ANALYSIS_LABELS[analysisType as AnalysisType]?.toLowerCase() ?? "analisi"} (F5)`}>
          <Button
            variant="run"
            size="md"
            disabled={!model || isRunning}
            loading={isRunning}
            iconLeft={!isRunning ? <Play className="h-3.5 w-3.5" /> : undefined}
            onClick={() => model && run()}
          >
            <span className="hidden sm:inline">{isRunning ? "Esecuzione…" : "Esegui"}</span>
          </Button>
        </Tooltip>
      </div>

      <div className="flex-1 min-w-0" />

      {/* Search-bar globale (apre command palette) */}
      <GlobalSearch />

      {/* Undo / Redo — visibili SOLO se almeno uno e' disponibile (alpha.31
          Task 17). La storia e' raggiungibile sempre via command palette. */}
      {(canUndo || canRedo) && (
        <div className="hidden md:flex items-center gap-1 border-l border-border pl-2 ml-1 flex-shrink-0">
          <Tooltip content="Annulla · Ctrl+Z">
            <button
              type="button"
              onClick={() => {
                const prev = useModelHistory.getState().undo();
                if (prev) useModelStore.getState().setModel(prev as FEAModel);
              }}
              disabled={!canUndo}
              className="w-7 h-7 rounded-md flex items-center justify-center text-ink-muted hover:bg-bg-hover hover:text-ink disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Annulla"
            >
              <Undo2 className="w-4 h-4" />
            </button>
          </Tooltip>
          <Tooltip content="Ripeti · Ctrl+Shift+Z">
            <button
              type="button"
              onClick={() => {
                const next = useModelHistory.getState().redo();
                if (next) useModelStore.getState().setModel(next as FEAModel);
              }}
              disabled={!canRedo}
              className="w-7 h-7 rounded-md flex items-center justify-center text-ink-muted hover:bg-bg-hover hover:text-ink disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Ripeti"
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </Tooltip>
        </div>
      )}

      {/* AI Copilot button (placeholder Sprint 5) */}
      <AICopilotButton />

      {/* Avatar utente: dropdown con Account / Loads / Tema / Logout
          (sostituisce i bottoni isolati Loads/Account/Login in topbar) */}
      <AvatarMenu />

      {/* Bell notifications — visibile SOLO se ci sono notifiche unread
          (alpha.31 Task 17). Centro notifiche raggiungibile sempre via
          command palette ("Mostra notifiche"). */}
      {unreadCount > 0 && (
        <Tooltip content="Notifiche">
          <button
            type="button"
            onClick={() => toast("info", "Centro notifiche in arrivo (sheet).")}
            className="relative w-8 h-8 rounded-md flex items-center justify-center text-ink-muted hover:bg-bg-hover hover:text-ink flex-shrink-0"
            aria-label="Notifiche"
            data-testid="topbar-bell"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-0.5 right-0.5 bg-coral text-white rounded-full text-[9px] font-semibold px-1 py-0.5 border-2 border-bg-panel min-w-[16px] leading-none text-center">
              {unreadCount}
            </span>
          </button>
        </Tooltip>
      )}

      {/* Focus + Export ora nel dropdown AvatarMenu (alpha.31 Task 18).
          Focus resta sempre accessibile via Shift+Space e command palette. */}

      {/* Right side: dialogs portal */}
      <NewModelDialog open={newOpen} onClose={() => setNewOpen(false)} />
      <EditModelDialog open={editOpen} onClose={() => setEditOpen(false)} />
      <AccountDialog open={accountOpen} onClose={() => setAccountOpen(false)} />
      <LocationPickerDialog
        open={locationOpen}
        onClose={() => setLocationOpen(false)}
        onApply={(bundle) => setClimateBundle(bundle)}
      />
      <AuthDialog open={authOpen} onClose={() => setAuthOpen(false)} />
    </header>
  );
}
