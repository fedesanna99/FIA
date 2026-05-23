/**
 * ViewportHud — chip informativi top-left del viewport (mockup v1.3).
 *
 * Tre pillole sovrapposte al Canvas:
 *  - [📦 cubo]   nome modello
 *  - [📚 layers] N nodi · E elementi · materiale
 *  - [● ping]    Auto-save (puntino verde animato)
 *
 * `materials` non è ancora nello schema FEAModel ufficiale: accesso
 * difensivo + fallback "—".
 */
import type { ReactNode } from "react";
import { Box, Gauge, Layers, SlidersHorizontal } from "lucide-react";
import { useModelStore } from "../../store/modelStore";
import { useAnalysisStore } from "../../store/analysisStore";
import { createViewportEngineStats } from "../../viewport-engine/viewportEngineStats";

const PRESET_LABELS = {
  engineer: "Tecnica",
  cad: "CAD",
  review: "Review",
  performance: "Perf",
  custom: "Custom",
} as const;

export function ViewportHud() {
  const model = useModelStore((s) => s.model);
  const activeViewPreset = useAnalysisStore((s) => s.activeViewPreset);
  const viewportMode = useAnalysisStore((s) => s.viewportMode);
  const projection = useAnalysisStore((s) => s.projection);
  const showGrid = useAnalysisStore((s) => s.showGrid);
  const showLoads = useAnalysisStore((s) => s.showLoads);
  const showConstraints = useAnalysisStore((s) => s.showConstraints);
  const showNodeLabels = useAnalysisStore((s) => s.showNodeLabels);
  const useViewportEngine = useAnalysisStore((s) => s.useViewportEngine);
  const toggleViewportEngine = useAnalysisStore((s) => s.toggleViewportEngine);
  if (!model) return null;

  const nNodes = model.nodes?.length ?? 0;
  const nElems = model.elements?.length ?? 0;
  const stats = createViewportEngineStats(model);
  const activeBaseLayers = [showGrid, showLoads, showConstraints, showNodeLabels].filter(Boolean).length;
  const renderLabel = viewportMode === "wireframe" ? "Wire" : viewportMode === "transparent" ? "Transp" : "Solid";
  const cameraLabel = projection === "orthographic" ? "Orto" : "Persp";
  // v1.7-polish T3: ora `materials?` esiste in FEAModel — cast unsafe rimosso.
  const material = model.materials?.[0]?.name ?? "—";

  return (
    <div className="absolute top-3.5 left-3.5 right-3.5 z-toolbar flex flex-wrap items-start gap-2 pointer-events-none">
      <Chip icon={<Box className="w-3 h-3" />} className="max-w-[220px]" title={model.name}>
        {model.name}
      </Chip>
      <Chip
        icon={<Layers className="w-3 h-3" />}
        className="max-w-[260px]"
        title={`${nNodes} nodi · ${nElems} elem · ${material}`}
      >
        {nNodes} nodi · {nElems} elem · {material}
      </Chip>
      <button
        className="pointer-events-auto max-w-[220px] min-w-0 bg-bg-panel border border-border px-2.5 py-1.5 flex items-center gap-1.5 text-[11px] text-ink-2 hover:text-ink hover:bg-bg-hover shadow-pop font-mono transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
        onClick={() => window.dispatchEvent(new CustomEvent("feapro:open-view-panel"))}
        title="Apri cockpit View"
        data-testid="viewport-hud-open-view"
      >
        <SlidersHorizontal className="w-3 h-3 flex-shrink-0" />
        <span className="truncate">
          {PRESET_LABELS[activeViewPreset]} · {renderLabel} · {cameraLabel} · L{activeBaseLayers}
        </span>
      </button>
      <button
        className={`pointer-events-auto flex-shrink-0 bg-bg-panel border px-2.5 py-1.5 flex items-center gap-1.5 text-[11px] shadow-pop font-mono transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 ${
          useViewportEngine
            ? "border-accent text-accent"
            : "border-border text-ink-2 hover:text-ink hover:bg-bg-hover"
        }`}
        onClick={toggleViewportEngine}
        title={useViewportEngine
          ? `ViewportEngine attivo (${stats.compressionRatio.toFixed(1)}x)`
          : "Attiva ViewportEngine GPU-first"}
      >
        <Gauge className="w-3 h-3 flex-shrink-0" />
        Engine
      </button>
      {/* alpha.31 Task 20: "Auto-save" chip rimosso — ridondante con il
          chip "✓ Salvato HH:MM" in topbar. */}
    </div>
  );
}

function Chip({
  icon,
  children,
  className = "",
  title,
}: {
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <div
      className={`bg-bg-panel border border-border px-2.5 py-1.5 flex items-center gap-1.5 text-[11px] text-ink-2 shadow-pop font-mono min-w-0 ${className}`}
      title={title}
    >
      {icon ? <span className="flex-shrink-0">{icon}</span> : null}
      <span className="truncate">{children}</span>
    </div>
  );
}
