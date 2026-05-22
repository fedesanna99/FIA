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
  Loader2,
} from "lucide-react";
import type { FEAModel } from "../../types/model";
import { modelsApi } from "../../api/client";
import { useAnalysisStore } from "../../store/analysisStore";
import { useRunAnalysis } from "../../hooks/useAnalysis";
import { useModelStore } from "../../store/modelStore";
import { useModelHistory } from "../../store/historyStore";
import { useWorkspaceStore } from "../../store/workspaceStore";
import { useJobsStore } from "../../store/jobsStore";
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
  // v1.6.1 T3 · BUG-3: il badge "3" al primo avvio era correlato a toast
  // errore generici del backend offline (gia' fixati in T1: client.ts ora
  // non emette toast su network error puro). In piu' filtriamo qui per
  // contare SOLO toast error/warning come "notifiche unread": un toast
  // info "Tema scuro applicato" non deve far apparire il bell rosso.
  // alpha.30: placeholder. Verra' sostituito da notificationsStore dedicato
  // quando arrivera' la persistenza side-bar.
  const unreadCount = useToastStore((s) =>
    s.toasts.filter((t) => t.level === "error" || t.level === "warning").length,
  );
  // v1.6 S0 · B17: chip job attivo sempre visibile in topbar quando un'analisi
  // sta girando, cosi' l'utente vede progresso live senza dover aprire la
  // statusbar. Subscribe a activeJob da jobsStore.
  const activeJob = useJobsStore((s) => s.activeJob);
  // alpha.31 Task 19: Run topbar visibile solo se il SolvePanel non e' aperto.
  // Quando SolvePanel e' aperto, l'utente usa il Run dentro il pannello (anch'esso verde).
  const isSolveOpen = useWorkspaceStore((s) => s.currentLeftPanel === "solve");
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

  // v1.7 T6: respiro mobile — padding 12px e gap 8px anche su <sm
  // (prima px-2/gap-1.5). Elementi non-essenziali gia' nascosti via
  // hidden sm:inline / hidden md:flex.
  return (
    <header className="h-12 flex-shrink-0 border-b border-border bg-bg-panel flex items-center gap-2 px-3 min-w-0 overflow-hidden">
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

      {/* Run analysis — nascosto quando il SolvePanel e' aperto (in quel
          caso si usa il bottone "Esegui {analysis}" interno al pannello,
          anch'esso verde). alpha.31 Task 19. */}
      {!isSolveOpen && (
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
      )}

      {/* v1.6 S0 · B17: chip job attivo. Visibile sempre quando c'e'
          un'analisi in corso, mostra label + progress%. Permette
          all'utente di vedere che la UI NON e' bloccata (e' solo il
          solver che lavora in background). */}
      {activeJob && (
        <Tooltip
          content={
            <div>
              <div className="font-semibold">{activeJob.label}</div>
              <div className="text-[11px] text-ink-muted mt-0.5">
                {(activeJob.progress * 100).toFixed(0)}% completato
              </div>
            </div>
          }
        >
          <div
            className="flex items-center gap-2 bg-bg-info text-ink-info rounded-md px-2.5 py-1 text-[11px] font-medium border border-info/30 mx-1 flex-shrink-0"
            data-testid="topbar-active-job"
          >
            <Loader2 className="w-3 h-3 animate-spin" />
            <span className="hidden sm:inline">{activeJob.label}</span>
            <span className="font-mono text-[10px] opacity-80">
              {(activeJob.progress * 100).toFixed(0)}%
            </span>
          </div>
        </Tooltip>
      )}

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

      {/* AI Copilot button (placeholder Sprint 5).
          v1.5 Task 30 follow-up: nascosto su mobile (<md). Resta raggiungibile
          via palette → "AI Copilot · Debug FEM" / dropdown MobileMoreMenu. */}
      <div className="hidden md:flex">
        <AICopilotButton />
      </div>

      {/* Avatar utente: dropdown con Account / Loads / Tema / Logout
          (sostituisce i bottoni isolati Loads/Account/Login in topbar) */}
      <AvatarMenu />

      {/* Bell notifications — visibile SOLO se ci sono notifiche unread
          (alpha.31 Task 17). Centro notifiche raggiungibile sempre via
          command palette ("Mostra notifiche").
          v1.5 Task 30 follow-up: nascosto su mobile (<md) — i toast restano
          comunque visibili nello stack di alert in basso. */}
      {unreadCount > 0 && (
        <Tooltip content="Notifiche">
          <button
            type="button"
            onClick={() => toast("info", "Centro notifiche in arrivo (sheet).")}
            className="hidden md:flex relative w-8 h-8 rounded-md items-center justify-center text-ink-muted hover:bg-bg-hover hover:text-ink flex-shrink-0"
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
      <NewModelDialog
        open={newOpen}
        onClose={() => setNewOpen(false)}
        onCreated={(id) => {
          onSelect(id);
          toast("success", "Nuovo modello creato.");
        }}
      />
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
