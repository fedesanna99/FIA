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
            <div className="mt-1.5 text-[10px] font-mono text-ink-3">
              custom: override manuale attivo
            </div>
          )}
        </Section>

        <Section title="Render e camera" icon={<Monitor className="w-3 h-3" />}>
          <div className="grid grid-cols-3 gap-1">
            {(["wireframe", "solid", "transparent"] as const).map((mode) => (
              <SegmentButton
                key={mode}
                label={mode === "wireframe" ? "Wireframe" : mode === "solid" ? "Solido" : "Trasparente"}
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

        <Section title="Motore di rendering" icon={<Gauge className="w-3 h-3" />}>
          <div className="grid grid-cols-[1fr_1fr_auto] gap-1 items-stretch">
            <SegmentButton
              label="Classico"
              description="stabile"
              active={!useViewportEngine}
              onClick={() => useViewportEngine && toggleViewportEngine()}
              testId="view-engine-legacy"
            />
            <SegmentButton
              label="Accelerato GPU"
              description="WebGL"
              active={useViewportEngine}
              onClick={() => !useViewportEngine && toggleViewportEngine()}
              testId="view-engine-new"
            />
            <div className="min-w-[76px] border border-border-light bg-bg-panel px-2 py-1 font-mono text-[10px]">
              {engineStats ? (
                <>
                  <div className="text-ink-3 uppercase tracking-wide-1 font-semibold">draw {engineStats.engineDrawPaths}</div>
                  <div className="text-ink tabular-nums font-semibold">x{engineStats.compressionRatio.toFixed(1)}</div>
                </>
              ) : (
                <>
                  <div className="text-ink-3 uppercase tracking-wide-1">draw —</div>
                  <div className="text-ink-3 uppercase tracking-wide-1">no model</div>
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
            <div className="flex justify-between text-[10px] text-ink-3 mt-0.5">
              <span>x1</span>
              <span>x500</span>
              <span>x1000</span>
            </div>
          </Section>
        )}

        {!hasAnyResults && (
          <div className="border border-accent/30 bg-bg-info px-2.5 py-2 text-[11px] text-accent leading-snug">
            <strong className="font-mono uppercase tracking-wide-1 text-[10px] font-semibold">Overlay risultati spenti.</strong>{" "}
            Esegui una statica o una modale da Solve per abilitarli.
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
    <div className="border border-border bg-bg-panel px-2.5 py-2 grid grid-cols-3 gap-2 text-[10px] font-mono">
      <StatusCell label="preset" value={preset} />
      <StatusCell label="view" value={`${mode.slice(0, 5)} · ${projection === "orthographic" ? "orto" : "persp"}`} />
      <StatusCell label="layer" value={`${baseLayers}+${resultLayers} · ${engine ? "eng" : "leg"}`} />
    </div>
  );
}

function StatusCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="font-mono text-[9px] uppercase tracking-wide-2 text-ink-3 font-semibold">{label}</div>
      <div className="truncate text-ink font-semibold tabular-nums mt-0.5">{value}</div>
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
    <section className="border border-border bg-bg-panel">
      <h3 className="h-7 px-2.5 border-b border-border font-mono text-[10px] uppercase tracking-wide-2 text-ink-3 font-semibold flex items-center gap-1.5 bg-bg-elevated">
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
        "h-8 border px-1.5 font-mono text-[10px] uppercase tracking-wide-1 font-semibold transition-colors",
        active
          ? "bg-accent text-white border-accent"
          : "bg-bg-elevated border-border-light text-ink-3 hover:bg-bg-hover hover:text-ink",
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
        "min-h-8 border px-2 py-1 text-left transition-colors",
        "focus-visible:outline-none focus-visible:border-accent",
        active
          ? "bg-accent text-white border-accent"
          : "bg-bg-elevated border-border-light text-ink-3 hover:bg-bg-hover hover:text-ink",
      )}
    >
      <div className="text-[11px] font-semibold leading-tight">{label}</div>
      {/* v2.2.2 audit-fix P5: text-[9px] → text-[10px] per leggibilità mobile
          (era sotto soglia raccomandata WCAG per text descrittivo). */}
      {description && <div className="font-mono text-[10px] uppercase tracking-wide-1 opacity-80 leading-tight mt-0.5">{description}</div>}
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
        "min-h-8 border px-2 py-1.5 flex items-center gap-2 transition-colors",
        disabled
          ? "border-border-light bg-bg-panel/50 text-ink-3 opacity-60 cursor-not-allowed"
          : checked
            ? "border-accent/40 bg-accent-subtle text-accent cursor-pointer"
            : "border-border-light bg-bg-elevated text-ink-3 hover:bg-bg-hover hover:text-ink cursor-pointer",
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
        <span className="ml-auto font-mono text-[10px] uppercase tracking-wide-1 text-ink-3 truncate">{disabledHint}</span>
      )}
    </label>
  );
}
