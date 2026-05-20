/**
 * TopBar — barra superiore 48 px, sempre visibile.
 *
 *  Layout: [logo+name] · [selettore modello] · [+ Nuovo · ⎘ Dup · ✎ Edit] · [▶ Esegui] · spazio · [status · ?]
 *
 *  Mantiene la logica esistente (Toolbar.tsx) ma adottando i nuovi tokens.
 */
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Copy,
  Pencil,
  Play,
  ChevronDown,
  Loader2,
} from "lucide-react";
import type { FEAModel } from "../../types/model";
import { modelsApi } from "../../api/client";
import { useAnalysisStore } from "../../store/analysisStore";
import { useRunAnalysis } from "../../hooks/useAnalysis";
import { useModelStore } from "../../store/modelStore";
import { NewModelDialog } from "../dialogs/NewModelDialog";
import { EditModelDialog } from "../dialogs/EditModelDialog";
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
  const qc = useQueryClient();

  const dup = useMutation({
    mutationFn: (id: string) => modelsApi.duplicate(id),
    onSuccess: (m) => {
      qc.invalidateQueries({ queryKey: ["models"] });
      onSelect(m.id);
    },
  });

  return (
    <header className="h-12 flex-shrink-0 border-b border-border bg-bg-panel flex items-center gap-2 px-3">
      {/* Logo */}
      <div className="flex items-center gap-2 pr-2 border-r border-border h-7">
        <div className="w-6 h-6 rounded bg-accent/15 border border-accent/40 flex items-center justify-center">
          <span className="text-accent text-xs font-bold">F</span>
        </div>
        <span className="font-semibold text-sm text-ink">FEA Pro</span>
        <span className="text-[10px] font-mono text-ink-dim">v1.0</span>
      </div>

      {/* Model picker */}
      <div className="relative">
        <select
          className={cn(
            "appearance-none h-8 pl-3 pr-8 rounded-md text-sm",
            "bg-bg-elevated border border-border text-ink",
            "hover:bg-bg-hover focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30",
            "min-w-[220px] cursor-pointer",
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

      {/* Model CRUD */}
      <div className="flex items-center gap-1 pl-1 border-l border-border ml-1 pl-3">
        <Tooltip content="Nuovo modello">
          <Button size="sm" variant="secondary" iconLeft={<Plus className="h-3.5 w-3.5" />} onClick={() => setNewOpen(true)}>
            Nuovo
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
            Duplica
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
            Modifica
          </Button>
        </Tooltip>
      </div>

      {/* Run analysis */}
      <div className="flex items-center gap-2 pl-3 border-l border-border ml-1">
        <select
          className={cn(
            "h-8 px-2 rounded-md text-xs font-medium",
            "bg-bg-elevated border border-border text-ink",
            "hover:bg-bg-hover focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30",
            "cursor-pointer",
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
            {isRunning ? "Esecuzione…" : "Esegui"}
          </Button>
        </Tooltip>
        {isRunning && <Loader2 className="h-4 w-4 animate-spin text-accent" aria-hidden />}
      </div>

      <div className="flex-1" />

      {/* Export menu */}
      <ExportMenu />

      {/* Right side: dialogs portal */}
      <NewModelDialog open={newOpen} onClose={() => setNewOpen(false)} />
      <EditModelDialog open={editOpen} onClose={() => setEditOpen(false)} />
    </header>
  );
}
