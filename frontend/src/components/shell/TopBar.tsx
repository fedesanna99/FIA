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
  Plus,
  Copy,
  Pencil,
  Play,
  ChevronDown,
  Loader2,
  User,
  MapPin,
  LogIn,
  LogOut,
} from "lucide-react";
import type { FEAModel } from "../../types/model";
import { modelsApi } from "../../api/client";
import { useAnalysisStore } from "../../store/analysisStore";
import { useRunAnalysis } from "../../hooks/useAnalysis";
import { useModelStore } from "../../store/modelStore";
import { NewModelDialog } from "../dialogs/NewModelDialog";
import { EditModelDialog } from "../dialogs/EditModelDialog";
import { AccountDialog } from "../dialogs/AccountDialog";
import { LocationPickerDialog } from "../dialogs/LocationPickerDialog";
import { AuthDialog } from "../dialogs/AuthDialog";
import { useClimateStore } from "../../store/climateStore";
import { useAuthStore } from "../../store/authStore";
import { toast } from "../../store/toastStore";
import { APP_VERSION } from "../../lib/version";
import { Breadcrumb } from "./topbar/Breadcrumb";
import { GlobalSearch } from "./topbar/GlobalSearch";
import { AICopilotButton } from "./topbar/AICopilotButton";
import { CollabAvatars } from "./topbar/CollabAvatars";
import { ExportMenu } from "./ExportMenu";
import { Button } from "../ui/Button";
import { Tooltip } from "../ui/Tooltip";
import { cn } from "../ui/cn";

interface Props {
  models: FEAModel[];
  activeId: string | null;
  onSelect: (id: string) => void;
}

type AnalysisType = "static" | "modal" | "dynamic";

const ANALYSIS_LABELS: Record<AnalysisType, string> = {
  static:   "Statica",
  modal:    "Modale",
  dynamic:  "Dinamica",
};

export function TopBar({ models, activeId, onSelect }: Props) {
  const { analysisType, setAnalysisType, isRunning } = useAnalysisStore();
  const run = useRunAnalysis();
  const model = useModelStore((s) => s.model);
  const [newOpen, setNewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const setClimateBundle = useClimateStore((s) => s.setBundle);
  const authUser = useAuthStore((s) => s.user);
  const authToken = useAuthStore((s) => s.token);
  const authLogout = useAuthStore((s) => s.logout);
  const verifyToken = useAuthStore((s) => s.verifyToken);
  const qc = useQueryClient();

  // Al mount: se c'e' un token salvato, valida lato server (se invalido → logout)
  useEffect(() => {
    if (authToken && !authUser) {
      verifyToken();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dup = useMutation({
    mutationFn: (id: string) => modelsApi.duplicate(id),
    onSuccess: (m) => {
      qc.invalidateQueries({ queryKey: ["models"] });
      onSelect(m.id);
    },
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

      {/* Breadcrumb: modello attivo › workspace (>= lg) */}
      <Breadcrumb />

      {/* Model picker — fluido su mobile, fisso su desktop */}
      <div className="relative min-w-0 flex-1 sm:flex-initial">
        <select
          className={cn(
            "appearance-none h-8 pl-3 pr-8 rounded-md text-sm",
            "bg-bg-elevated border border-border text-ink",
            "hover:bg-bg-hover focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30",
            "w-full sm:min-w-[180px] md:min-w-[220px] cursor-pointer truncate",
          )}
          value={activeId ?? ""}
          onChange={(e) => onSelect(e.target.value)}
          aria-label="Modello attivo"
        >
          <option value="">— scegli modello —</option>
          {models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted pointer-events-none" />
      </div>

      {/* Model CRUD — solo icone <md, icona+label da md in su */}
      <div className="flex items-center gap-1 pl-2 border-l border-border ml-1 md:pl-3 flex-shrink-0">
        <Tooltip content="Nuovo modello">
          <Button size="sm" variant="secondary" iconLeft={<Plus className="h-3.5 w-3.5" />} onClick={() => setNewOpen(true)}>
            <span className="hidden md:inline">Nuovo</span>
          </Button>
        </Tooltip>
        <Tooltip content="Duplica modello corrente">
          <Button
            size="sm"
            variant="ghost"
            iconLeft={<Copy className="h-3.5 w-3.5" />}
            disabled={!activeId || dup.isPending}
            loading={dup.isPending}
            onClick={() => activeId && dup.mutate(activeId)}
          >
            <span className="hidden md:inline">Duplica</span>
          </Button>
        </Tooltip>
        <Tooltip content="Modifica nome / descrizione">
          <Button
            size="sm"
            variant="ghost"
            iconLeft={<Pencil className="h-3.5 w-3.5" />}
            disabled={!activeId}
            onClick={() => setEditOpen(true)}
          >
            <span className="hidden md:inline">Modifica</span>
          </Button>
        </Tooltip>
      </div>

      {/* Run analysis — il select del tipo è nascosto sotto sm */}
      <div className="flex items-center gap-1.5 sm:gap-2 pl-2 md:pl-3 border-l border-border ml-1 flex-shrink-0">
        <select
          className={cn(
            "h-8 px-2 rounded-md text-xs font-medium",
            "bg-bg-elevated border border-border text-ink",
            "hover:bg-bg-hover focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30",
            "cursor-pointer hidden sm:block",
          )}
          value={analysisType}
          onChange={(e) => setAnalysisType(e.target.value as AnalysisType)}
          aria-label="Tipo analisi"
        >
          {(Object.keys(ANALYSIS_LABELS) as AnalysisType[]).map((t) => (
            <option key={t} value={t}>
              {ANALYSIS_LABELS[t]}
            </option>
          ))}
        </select>
        <Tooltip content={`Esegui ${ANALYSIS_LABELS[analysisType as AnalysisType]?.toLowerCase() ?? "analisi"} (F5)`}>
          <Button
            variant="primary"
            size="md"
            disabled={!model || isRunning}
            loading={isRunning}
            iconLeft={!isRunning ? <Play className="h-3.5 w-3.5" /> : undefined}
            onClick={() => model && run()}
          >
            <span className="hidden sm:inline">{isRunning ? "Esecuzione…" : "Esegui"}</span>
          </Button>
        </Tooltip>
        {isRunning && <Loader2 className="h-4 w-4 animate-spin text-accent hidden sm:inline" aria-hidden />}
      </div>

      <div className="flex-1 min-w-0" />

      {/* Search-bar globale (apre command palette) */}
      <GlobalSearch />

      {/* AI Copilot button (placeholder Sprint 5) */}
      <AICopilotButton />

      {/* Collab avatar (solo se loggato) */}
      <CollabAvatars />

      {/* Location picker (Sprint 2 piano B: B1+B2+B3+B4 facade) */}
      <Tooltip content="Picker location: vento/neve/sismica da coordinate">
        <Button
          size="sm"
          variant="ghost"
          iconLeft={<MapPin className="h-3.5 w-3.5" />}
          onClick={() => setLocationOpen(true)}
          data-testid="topbar-location"
        >
          <span className="hidden md:inline">Loads</span>
        </Button>
      </Tooltip>

      {/* Account button (usage/tier/admin) */}
      <Tooltip content="Account: usage, tier, admin">
        <Button
          size="sm"
          variant="ghost"
          iconLeft={<User className="h-3.5 w-3.5" />}
          onClick={() => setAccountOpen(true)}
          data-testid="topbar-account"
        >
          <span className="hidden md:inline">Account</span>
        </Button>
      </Tooltip>

      {/* Auth button: Login se anonimo, Logout (con email) se loggato */}
      {authUser ? (
        <Tooltip content={`Logged in: ${authUser.email}. Click per logout.`}>
          <Button
            size="sm"
            variant="ghost"
            iconLeft={<LogOut className="h-3.5 w-3.5" />}
            onClick={() => {
              authLogout();
              toast("info", "Disconnesso.");
            }}
            data-testid="topbar-logout"
          >
            <span className="hidden md:inline truncate max-w-[140px]">
              {authUser.email}
            </span>
          </Button>
        </Tooltip>
      ) : (
        <Tooltip content="Accedi o crea un account">
          <Button
            size="sm"
            variant="ghost"
            iconLeft={<LogIn className="h-3.5 w-3.5" />}
            onClick={() => setAuthOpen(true)}
            data-testid="topbar-login"
          >
            <span className="hidden md:inline">Accedi</span>
          </Button>
        </Tooltip>
      )}

      {/* Export menu — visibile sempre */}
      <div className="flex-shrink-0">
        <ExportMenu />
      </div>

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
