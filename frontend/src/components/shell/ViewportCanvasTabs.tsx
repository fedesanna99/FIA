/**
 * ViewportCanvasTabs (Precision v2.0 PR16 T3) — B1 mockup parity.
 *
 * Tab bar che vive sopra il viewport in Studio Pro, replicando il pattern
 * B1-studio-pro-workspace.html di Claude Design.
 *
 * 5 tab uppercase mono: Modello / Carichi & BCs / Mesh / Risultati / Checks.
 * Stato active border-cyan + bg-accent-subtle. Click dispatchera' custom
 * event `feapro:viewport-tab` per consenso lasco con resultsStore /
 * loadsStore (panel right rail già esistente).
 *
 * Stateless: tab attivo viene letto da prop opzionale `activeTab` (default
 * "model"); chi monta puo' wirare il proprio store. Default usa custom
 * event verso il window per quando non hai uno store dedicato.
 */
import { useState } from "react";
import { cn } from "../ui/cn";

export type CanvasTabId = "model" | "loads" | "mesh" | "results" | "checks";

const TABS: { id: CanvasTabId; label: string }[] = [
  { id: "model",   label: "Modello" },
  { id: "loads",   label: "Carichi & BCs" },
  { id: "mesh",    label: "Mesh" },
  { id: "results", label: "Risultati" },
  { id: "checks",  label: "Checks" },
];

interface Props {
  /** Tab corrente. Se omesso, è gestito da stato interno. */
  activeTab?: CanvasTabId;
  onTabChange?: (tab: CanvasTabId) => void;
  /** Numeri counts opzionali da mostrare in meta a destra. */
  nodes?: number;
  elements?: number;
  dof?: number;
  className?: string;
}

export function ViewportCanvasTabs({
  activeTab,
  onTabChange,
  nodes,
  elements,
  dof,
  className,
}: Props) {
  const [internal, setInternal] = useState<CanvasTabId>("model");
  const current = activeTab ?? internal;

  const setTab = (id: CanvasTabId) => {
    if (onTabChange) {
      onTabChange(id);
    } else {
      setInternal(id);
    }
    window.dispatchEvent(new CustomEvent("feapro:viewport-tab", { detail: { tab: id } }));
  };

  return (
    <div
      className={cn(
        "flex items-center gap-3.5 px-3.5 py-2 bg-bg-panel border-b border-border",
        className,
      )}
      data-testid="viewport-canvas-tabs"
    >
      <div className="flex items-center gap-0.5">
        {TABS.map((t) => {
          const isActive = current === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              data-testid={`viewport-tab-${t.id}`}
              className={cn(
                "px-2.5 py-1 font-mono text-[11px] uppercase tracking-wide-1 border transition-colors duration-fast",
                isActive
                  ? "text-accent border-accent bg-accent-subtle"
                  : "text-ink-3 border-transparent hover:text-ink",
              )}
              aria-current={isActive ? "page" : undefined}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      <div className="flex-1" />
      {(nodes !== undefined || elements !== undefined || dof !== undefined) && (
        <div className="flex items-center gap-3.5 font-mono text-[10px] text-ink-3 tabular-nums">
          {nodes !== undefined && (
            <span>
              <b className="text-ink font-semibold">{nodes}</b> nodi
            </span>
          )}
          {elements !== undefined && (
            <span>
              <b className="text-ink font-semibold">{elements}</b> elementi
            </span>
          )}
          {dof !== undefined && (
            <span>
              <b className="text-ink font-semibold">{dof}</b> DOF
            </span>
          )}
        </div>
      )}
    </div>
  );
}
