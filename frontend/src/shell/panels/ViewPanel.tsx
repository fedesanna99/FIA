/**
 * ViewPanel (alpha.31+) — compact viewport cockpit.
 *
 * Right rail panel for renderer, camera, base layers and result overlays.
 * It keeps the legacy renderer available and makes the new engine opt-in.
 */
import { IconEye } from "@tabler/icons-react";
import { Gauge, Grid3X3, Monitor } from "lucide-react";
import clsx from "clsx";
import type { ViewPreset } from "../../store/analysisStore";
import { useWorkspaceStore } from "../../store/workspaceStore";
import { useRightRailStore } from "../../store/rightRailStore";
import { useModelStore } from "../../store/modelStore";
import { useAnalysisStore } from "../../store/analysisStore";
import { useResultsStore } from "../../store/resultsStore";
import { createViewportEngineStats } from "../../viewport-engine/viewportEngineStats";
import { PanelChrome } from "./PanelChrome";

const VIEW_PRESETS: Array<{
  id: Exclude<ViewPreset, "custom">;
  label: string;
  description: string;
}> = [
  { id: "engineer", label: "Tecnica", description: "solid + layer" },
  { id: "cad", label: "CAD", description: "wire + orto" },
  { id: "review", label: "Review", description: "transp + pulita" },
  { id: "performance", label: "Perf", description: "engine + light" },
];

export function ViewPanel() {
  const closeRight = useWorkspaceStore((s) => s.closeRightPanel);
  const closeRail = useRightRailStore((s) => s.close);
  const model = useModelStore((s) => s.model);

  const viewportMode = useAnalysisStore((s) => s.viewportMode);
  const setViewportMode = useAnalysisStore((s) => s.setViewportMode);
  const projection = useAnalysisStore((s) => s.projection);
  const setProjection = useAnalysisStore((s) => s.setProjection);
  const showGrid = useAnalysisStore((s) => s.showGrid);
  const toggleGrid = useAnalysisStore((s) => s.toggleGrid);
  const showLoads = useAnalysisStore((s) => s.showLoads);
  const toggleLoads = useAnalysisStore((s) => s.toggleLoads);
  const showConstraints = useAnalysisStore((s) => s.showConstraints);
  const toggleConstraints = useAnalysisStore((s) => s.toggleConstraints);
  const showNodeLabels = useAnalysisStore((s) => s.showNodeLabels);
  const toggleNodeLabels = useAnalysisStore((s) => s.toggleNodeLabels);
  const showDiagrams = useAnalysisStore((s) => s.showDiagrams);
  const toggleDiagrams = useAnalysisStore((s) => s.toggleDiagrams);
  const diagramComponent = useAnalysisStore((s) => s.diagramComponent);
  const setDiagramComponent = useAnalysisStore((s) => s.setDiagramComponent);
  const showPrincipals = useAnalysisStore((s) => s.showPrincipals);
  const togglePrincipals = useAnalysisStore((s) => s.togglePrincipals);
  const useViewportEngine = useAnalysisStore((s) => s.useViewportEngine);
  const toggleViewportEngine = useAnalysisStore((s) => s.toggleViewportEngine);
  const activeViewPreset = useAnalysisStore((s) => s.activeViewPreset);
  const applyViewPreset = useAnalysisStore((s) => s.applyViewPreset);

  const showDeformed = useResultsStore((s) => s.showDeformed);
  const toggleDeformed = useResultsStore((s) => s.toggleDeformed);
  const showStress = useResultsStore((s) => s.showStressColormap);
  const toggleStress = useResultsStore((s) => s.toggleStressColormap);
  const showIso = useResultsStore((s) => s.showIsosurfaces);
  const toggleIso = useResultsStore((s) => s.toggleIsosurfaces);
  const deformedScale = useResultsStore((s) => s.deformedScale);
  const setDeformedScale = useResultsStore((s) => s.setDeformedScale);

  const hasStaticResults = useResultsStore((s) => s.staticResults !== null);
  const hasModalResults = useResultsStore((s) => s.modalResults !== null);
  const hasIsoData = useResultsStore((s) => s.isosurfaceData !== null);
  const hasAnyResults = hasStaticResults || hasModalResults;
  const engineStats = model ? createViewportEngineStats(model) : null;

  const presetLabel =
    activeViewPreset === "custom"
      ? "Custom"
      : VIEW_PRESETS.find((p) => p.id === activeViewPreset)?.label ?? "Tecnica";
  const activeBaseLayers = [showGrid, showLoads, showConstraints, showNodeLabels].filter(Boolean).length;
  const activeResultLayers = [showDeformed, showStress, showIso, showDiagrams, showPrincipals].filter(Boolean).length;

  function handleClose() {
    closeRight();
    closeRail();
  }

  return (
    <PanelChrome
      side="right"
      title="View"
      Icon={IconEye}
      subtitle="viewport cockpit"
      onClose={handleClose}
      testId="panel-view"
    >
      <div className="p-2.5 space-y-2.5">
        <ViewStatusStrip
          preset={presetLabel}
          mode={viewportMode}
          projection={projection}
          engine={useViewportEngine}
          baseLayers={activeBaseLayers}
          resultLayers={activeResultLayers}
        />

        <Section title="Preset vista">
          <div className="grid grid-cols-4 gap-1">
            {VIEW_PRESETS.map((preset) => (
              <PresetButton
                key={preset.id}
                label={preset.label}
                title={preset.description}
                active={activeViewPreset === preset.id}
                onClick={() => applyViewPreset(preset.id)}
                testId={`view-preset-${preset.id}`}
              />
            ))}
          </div>
          {activeViewPreset === "custom" && (
            <div className="mt-1.5 text-[10px] font-mono text-ink-muted">
              custom: override manuale attivo
            </div>
          )}
        </Section>

        <Section title="Render e camera" icon={<Monitor className="w-3 h-3" />}>
          <div className="grid grid-cols-3 gap-1">
            {(["wireframe", "solid", "transparent"] as const).map((mode) => (
              <SegmentButton
                key={mode}
                label={mode === "wireframe" ? "Wire" : mode === "solid" ? "Solid" : "Transp"}
                active={viewportMode === mode}
                onClick={() => setViewportMode(mode)}
                testId={`view-mode-${mode}`}
              />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-1 mt-1">
            {(["perspective", "orthographic"] as const).map((mode) => (
              <SegmentButton
                key={mode}
                label={mode === "perspective" ? "Prospettica" : "Orto"}
                description={mode === "perspective" ? "3D" : "CAD"}
                active={projection === mode}
                onClick={() => setProjection(mode)}
                testId={`view-projection-${mode}`}
              />
            ))}
          </div>
        </Section>

        <Section title="Engine" icon={<Gauge className="w-3 h-3" />}>
          <div className="grid grid-cols-[1fr_1fr_auto] gap-1 items-stretch">
            <SegmentButton
              label="Legacy"
              description="stabile"
              active={!useViewportEngine}
              onClick={() => useViewportEngine && toggleViewportEngine()}
              testId="view-engine-legacy"
            />
            <SegmentButton
              label="Engine"
              description="GPU"
              active={useViewportEngine}
              onClick={() => !useViewportEngine && toggleViewportEngine()}
              testId="view-engine-new"
            />
            <div className="min-w-[76px] rounded-md border border-border bg-bg px-2 py-1 text-[10px] font-mono">
              {engineStats ? (
                <>
                  <div className="text-ink-dim">draw {engineStats.engineDrawPaths}</div>
                  <div className="text-ink">x{engineStats.compressionRatio.toFixed(1)}</div>
                </>
              ) : (
                <>
                  <div className="text-ink-dim">draw -</div>
                  <div className="text-ink">no model</div>
                </>
              )}
            </div>
          </div>
        </Section>

        <Section title="Layer base" icon={<Grid3X3 className="w-3 h-3" />}>
          <div className="grid grid-cols-2 gap-1">
            <Toggle label="Griglia" checked={showGrid} onChange={toggleGrid} testId="view-toggle-grid" />
            <Toggle label="Carichi" checked={showLoads} onChange={toggleLoads} testId="view-toggle-loads" />
            <Toggle label="Vincoli" checked={showConstraints} onChange={toggleConstraints} testId="view-toggle-constraints" />
            <Toggle label="Nodi ID" checked={showNodeLabels} onChange={toggleNodeLabels} testId="view-toggle-node-labels" />
          </div>
        </Section>

        <Section title="Risultati overlay">
          <div className="grid grid-cols-2 gap-1">
            <Toggle
              label="Deformata"
              checked={showDeformed}
              onChange={toggleDeformed}
              disabled={!hasStaticResults}
              disabledHint="statica"
              testId="view-toggle-deformed"
            />
            <Toggle
              label="Von Mises"
              checked={showStress}
              onChange={toggleStress}
              disabled={!hasStaticResults}
              disabledHint="statica"
              testId="view-toggle-stress"
            />
            <Toggle
              label="Iso 3D"
              checked={showIso}
              onChange={toggleIso}
              disabled={!hasIsoData}
              disabledHint="iso"
              testId="view-toggle-iso"
            />
            <Toggle
              label="N/V/M"
              checked={showDiagrams}
              onChange={toggleDiagrams}
              disabled={!hasStaticResults}
              disabledHint="statica"
              testId="view-toggle-diagrams"
            />
            <Toggle
              label="Sigma princ."
              checked={showPrincipals}
              onChange={togglePrincipals}
              disabled={!hasStaticResults}
              disabledHint="statica"
              testId="view-toggle-principals"
            />
          </div>
          {hasStaticResults && showDiagrams && (
            <div className="grid grid-cols-3 gap-1 mt-1">
              {(["N", "V", "M"] as const).map((component) => (
                <SegmentButton
                  key={component}
                  label={component}
                  active={diagramComponent === component}
                  onClick={() => setDiagramComponent(component)}
                  testId={`view-diagram-${component}`}
                />
              ))}
            </div>
          )}
        </Section>

        {hasStaticResults && showDeformed && (
          <Section title={`Scala deformata x${deformedScale}`}>
            <input
              type="range"
              min={1}
              max={1000}
              step={1}
              value={deformedScale}
              onChange={(e) => setDeformedScale(Number(e.target.value))}
              className="w-full accent-accent"
              data-testid="view-deformed-scale"
              aria-label="Scala deformata"
            />
            <div className="flex justify-between text-[10px] text-ink-muted mt-0.5">
              <span>x1</span>
              <span>x500</span>
              <span>x1000</span>
            </div>
          </Section>
        )}

        {!hasAnyResults && (
          <div className="border border-info/25 bg-bg-info rounded-md px-2.5 py-2 text-[11px] text-ink-info leading-snug">
            <strong>Overlay risultati spenti.</strong> Esegui una statica o una modale da Solve per abilitarli.
          </div>
        )}
      </div>
    </PanelChrome>
  );
}

function ViewStatusStrip({
  preset,
  mode,
  projection,
  engine,
  baseLayers,
  resultLayers,
}: {
  preset: string;
  mode: string;
  projection: string;
  engine: boolean;
  baseLayers: number;
  resultLayers: number;
}) {
  return (
    <div className="rounded-md border border-border bg-bg px-2 py-1.5 grid grid-cols-3 gap-2 text-[10px] font-mono">
      <StatusCell label="preset" value={preset} />
      <StatusCell label="view" value={`${mode.slice(0, 5)} · ${projection === "orthographic" ? "orto" : "persp"}`} />
      <StatusCell label="layer" value={`${baseLayers}+${resultLayers} · ${engine ? "eng" : "leg"}`} />
    </div>
  );
}

function StatusCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="uppercase tracking-wider text-ink-dim">{label}</div>
      <div className="truncate text-ink">{value}</div>
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-md border border-border/80 bg-bg-panel">
      <h3 className="h-7 px-2 border-b border-border/70 text-[10px] uppercase tracking-wider text-ink-muted font-semibold flex items-center gap-1.5">
        {icon}
        {title}
      </h3>
      <div className="p-2">{children}</div>
    </section>
  );
}

function PresetButton({
  label,
  title,
  active,
  onClick,
  testId,
}: {
  label: string;
  title: string;
  active: boolean;
  onClick: () => void;
  testId?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      data-testid={testId}
      aria-pressed={active}
      className={clsx(
        "h-8 rounded-md border px-1.5 text-[11px] font-semibold transition-colors",
        active
          ? "bg-bg-info border-info/40 text-ink-info"
          : "bg-bg border-border text-ink-muted hover:bg-bg-hover hover:text-ink",
      )}
    >
      {label}
    </button>
  );
}

function SegmentButton({
  label,
  description,
  active,
  onClick,
  testId,
}: {
  label: string;
  description?: string;
  active: boolean;
  onClick: () => void;
  testId?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      aria-pressed={active}
      className={clsx(
        "min-h-8 rounded-md border px-2 py-1 text-left transition-colors",
        "focus-visible:ring-2 focus-visible:ring-accent/60",
        active
          ? "bg-bg-info border-info/40 text-ink-info"
          : "bg-bg border-border text-ink-muted hover:bg-bg-hover hover:text-ink",
      )}
    >
      <div className="text-[11px] font-semibold leading-tight">{label}</div>
      {description && <div className="text-[9px] font-mono opacity-75 leading-tight">{description}</div>}
    </button>
  );
}

function Toggle({
  label,
  checked,
  onChange,
  disabled,
  disabledHint,
  testId,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  disabledHint?: string;
  testId?: string;
}) {
  return (
    <label
      className={clsx(
        "min-h-8 rounded-md border px-2 py-1.5 flex items-center gap-2 transition-colors",
        disabled
          ? "border-border/70 bg-bg/50 text-ink-dim opacity-60 cursor-not-allowed"
          : checked
            ? "border-info/35 bg-bg-info text-ink-info cursor-pointer"
            : "border-border bg-bg text-ink-muted hover:bg-bg-hover hover:text-ink cursor-pointer",
      )}
    >
      <input
        type="checkbox"
        checked={checked && !disabled}
        onChange={() => !disabled && onChange()}
        disabled={disabled}
        data-testid={testId}
        className="sr-only"
      />
      <span
        className={clsx(
          "w-2 h-2 rounded-full flex-shrink-0",
          checked && !disabled ? "bg-accent" : "bg-border-strong",
        )}
      />
      <span className="text-[11px] font-medium truncate">{label}</span>
      {disabled && disabledHint && (
        <span className="ml-auto text-[9px] font-mono text-ink-dim truncate">{disabledHint}</span>
      )}
    </label>
  );
}
