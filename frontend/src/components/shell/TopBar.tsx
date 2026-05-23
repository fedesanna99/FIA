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
import { useEffect, useState, lazy, Suspense } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getQuota } from "../../api/billing";
import {
  Play,
  Check,
  Undo2,
  Redo2,
  Bell,
  Loader2,
  Pencil,
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
// v1.7-polish T2: AccountDialog lazy-loaded (raramente aperto, ~30kB).
const AccountDialog = lazy(() =>
  import("../dialogs/AccountDialog").then((m) => ({ default: m.AccountDialog })),
);
import { LocationPickerDialog } from "../dialogs/LocationPickerDialog";
// AuthDialog rimosso: v2.1.4 auth-gate fa login obbligatorio prima
// di montare App, quindi il dialog "Accedi" non serve più qui.
import { useClimateStore } from "../../store/climateStore";
import { useAuthStore } from "../../store/authStore";
import { toast } from "../../store/toastStore";
import { useNotificationsStore } from "../../store/notificationsStore";
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
  // v2.3.0: undo/redo wired al modelStore. La history si popola
  // automaticamente a ogni mutation (add/update/remove di
  // nodi/elementi/loads/constraints). I bottoni si abilitano da soli.
  const canUndo = useModelHistory((s) => s.past.length > 1);
  const canRedo = useModelHistory((s) => s.future.length > 0);
  // v1.7-polish-pass2 T2: bell counter ora legge da notificationsStore
  // dedicato (no piu' useToastStore filtrato). Le notifiche persistono
  // anche dopo che il toast e' sparito (3-6s), quindi il badge ora ha
  // semantica corretta "non lette" invece di "toast attualmente in stack".
  const unreadCount = useNotificationsStore((s) =>
    s.items.filter((n) => !n.read).length,
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
  const setClimateBundle = useClimateStore((s) => s.setBundle);
  const qc = useQueryClient();

  // v2.1.4 auth-gate: l'AuthGate (in main.tsx) chiama bootstrap() al boot e
  // ha già validato il token via /api/auth/me prima che TopBar venga montato.
  // Niente più verifyToken() qui — questo componente assume utente loggato.

  // Listener custom events dalla Command Palette per aprire i dialog
  // gestiti dal TopBar (account/location). Evita prop drilling.
  // v2.1.4: rimosso listener `feapro:open-auth` (gate prevede auth obbligatorio).
  useEffect(() => {
    const openAcc = () => setAccountOpen(true);
    const openLoc = () => setLocationOpen(true);
    const openNew = () => setNewOpen(true);
    window.addEventListener("feapro:open-account", openAcc);
    window.addEventListener("feapro:open-location", openLoc);
    window.addEventListener("feapro:open-new-model", openNew);
    return () => {
      window.removeEventListener("feapro:open-account", openAcc);
      window.removeEventListener("feapro:open-location", openLoc);
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
      {/* Logo + version + tier badge (Precision v2.0) */}
      <div className="flex items-center gap-2 pr-3 border-r border-border h-7 flex-shrink-0">
        <div className="w-6 h-6 bg-accent/10 border border-accent/40 flex items-center justify-center">
          <span className="text-accent text-xs font-bold font-display">F</span>
        </div>
        <span className="font-display font-semibold text-sm text-ink hidden sm:inline tracking-tight-1">FEA Pro</span>
        <TopBarTierBadge />
        <span className="font-mono text-[10px] uppercase tracking-wide-1 text-ink-3 hidden md:inline">{APP_VERSION}</span>
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
      {/* v1.8 T6: edit nome modello inline rapido (apre EditModelDialog).
          Visibile solo con modello attivo; click su pencil → dialog edit. */}
      {activeId && model && (
        <Tooltip content="Modifica nome / descrizione modello">
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            data-testid="topbar-edit-model"
            aria-label="Modifica modello"
            className="h-7 w-7 flex items-center justify-center text-ink-3 hover:text-ink hover:bg-bg-hover transition-colors flex-shrink-0"
          >
            <Pencil className="w-3.5 h-3.5" strokeWidth={1.8} />
          </button>
        </Tooltip>
      )}

      {/* Save status chip — visibile quando il modello e' stato salvato.
          v1.8.3 T3: animazione fadein soft via animate-fade-in (definito in
          tailwind keyframes) per evitare comparsa brusca. */}
      {lastSavedAt && (
        <div
          className="hidden md:inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wide-1 bg-bg-success border border-success/30 text-success px-2 py-1 flex-shrink-0 animate-slide-down font-semibold"
          data-testid="topbar-save-chip"
        >
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
              <div className="text-[11px] text-ink-3 mt-0.5">
                {(activeJob.progress * 100).toFixed(0)}% completato
              </div>
            </div>
          }
        >
          <div
            className="inline-flex items-center gap-2 bg-bg-info text-accent px-2.5 py-1 text-[11px] font-medium border border-accent/30 mx-1 flex-shrink-0"
            data-testid="topbar-active-job"
          >
            <Loader2 className="w-3 h-3 animate-spin" />
            <span className="hidden sm:inline">{activeJob.label}</span>
            <span className="font-mono text-[10px] tabular-nums opacity-80">
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
              data-testid="topbar-undo"
              onClick={() => { useModelStore.getState().undo(); }}
              disabled={!canUndo}
              className="w-7 h-7 flex items-center justify-center text-ink-3 hover:bg-bg-hover hover:text-ink disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Annulla"
            >
              <Undo2 className="w-4 h-4" />
            </button>
          </Tooltip>
          <Tooltip content="Ripeti · Ctrl+Shift+Z">
            <button
              type="button"
              data-testid="topbar-redo"
              onClick={() => { useModelStore.getState().redo(); }}
              disabled={!canRedo}
              className="w-7 h-7 flex items-center justify-center text-ink-3 hover:bg-bg-hover hover:text-ink disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
            onClick={() => {
              // v1.7-polish-pass2: click bell -> mark-all-read. Sheet centro
              // notifiche resta TODO (placeholder toast informativo).
              useNotificationsStore.getState().markAllRead();
              toast("info", "Centro notifiche in arrivo (sheet).");
            }}
            className="hidden md:flex relative w-8 h-8 items-center justify-center text-ink-3 hover:bg-bg-hover hover:text-ink flex-shrink-0 transition-colors"
            aria-label="Notifiche"
            data-testid="topbar-bell"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 bg-coral text-white rounded-full font-mono text-[9px] font-bold px-1 leading-tight border border-bg-panel min-w-[14px] h-[14px] flex items-center justify-center tabular-nums">
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
      {accountOpen && (
        <Suspense fallback={null}>
          <AccountDialog open={accountOpen} onClose={() => setAccountOpen(false)} />
        </Suspense>
      )}
      <LocationPickerDialog
        open={locationOpen}
        onClose={() => setLocationOpen(false)}
        onApply={(bundle) => setClimateBundle(bundle)}
      />
      {/* v2.1.4 auth-gate: AuthDialog rimosso da qui (login obbligatorio
          al boot tramite AuthGate). */}
    </header>
  );
}


/**
 * TopBarTierBadge (v1.8.1 P2, esteso v1.8.2 T2).
 *
 * Tier dinamico letto dall'API billing/quota tramite React Query. Si
 * auto-refresha quando la cache `billing-quota` viene invalidata
 * altrove (es. dopo upgrade tier in AccountDialog).
 *
 * v1.8.2 T2: tooltip ricco con credits usage + mini progress bar invece
 * del semplice attributo `title=`. Visibile su hover (desktop) e
 * long-press (mobile, gestito dal componente Tooltip).
 *
 * Stili per tier:
 *   - free       → bg-bg-hover / text-ink-3   (default neutrale)
 *   - starter    → bg-bg-info / text-accent   (blu)
 *   - pro        → bg-bg-percorsi / text-accent (emerald, asse Percorsi)
 *   - enterprise → bg-bg-purple / text-purple (premium)
 */
function TopBarTierBadge() {
  const user = useAuthStore((s) => s.user);
  const userId = user?.id ?? "demo_user";
  const { data: quota } = useQuery({
    queryKey: ["billing-quota", userId],
    queryFn: () => getQuota(userId),
    retry: false,
    staleTime: 60_000,
  });
  const tier = quota?.tier ?? "free";

  const styleByTier: Record<typeof tier, string> = {
    free:       "bg-bg-hover text-ink-3 border-border",
    starter:    "bg-bg-info text-accent border-accent/30",
    pro:        "bg-bg-percorsi text-accent border-percorsi/30",
    enterprise: "bg-bg-purple text-purple border-purple/30",
  };

  // Credits usage calcolato dalla quota (used + bonus vs cap).
  const used = quota?.used_credits ?? 0;
  const bonus = quota?.bonus_credits ?? 0;
  const cap = quota?.cap_credits ?? 0;
  const total = used + bonus;
  const pct = cap > 0 ? Math.min(100, Math.round((total / cap) * 100)) : 0;
  const barColor = pct >= 90 ? "bg-coral" : pct >= 70 ? "bg-warn" : "bg-accent";

  const tooltipContent = (
    <div className="min-w-[180px] space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] uppercase tracking-wider text-ink-3 font-mono">
          Piano
        </span>
        <span className="text-ink font-semibold capitalize">{tier}</span>
      </div>
      {cap > 0 && (
        <>
          <div className="flex items-center justify-between gap-2 text-[11px]">
            <span className="text-ink-3">Crediti usati</span>
            <span className="font-mono text-ink">
              {total}
              <span className="text-ink-3"> / {cap}</span>
            </span>
          </div>
          <div className="h-1 bg-bg-hover rounded-full overflow-hidden">
            <div
              className={`h-full ${barColor} transition-all`}
              style={{ width: `${pct}%` }}
              data-testid="topbar-tier-quota-bar"
            />
          </div>
          <div className="text-[10px] text-ink-3">
            {quota?.month ? `Mese ${quota.month}` : ""}
          </div>
        </>
      )}
      {tier === "free" && (
        <div className="text-[10px] text-ink-3 pt-1 border-t border-border">
          Upgrade per crediti illimitati →
        </div>
      )}
    </div>
  );

  return (
    <Tooltip content={tooltipContent}>
      <span
        className={`hidden sm:inline text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded border leading-none capitalize cursor-help ${styleByTier[tier]}`}
        data-testid="topbar-tier-badge"
      >
        {tier}
      </span>
    </Tooltip>
  );
}
