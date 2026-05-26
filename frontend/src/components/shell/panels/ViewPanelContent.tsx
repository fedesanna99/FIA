/**
 * ViewPanelContent — alpha.17.
 *
 * Toggle layer-visibility nel viewport. In alpha.20 sostituira' la parte
 * "View options" del Results workspace. Per ora pesca direttamente dai
 * resultsStore / uiStore esistenti.
 *
 * v2.5.7 cluster A (BUG-014+015): ogni toggle è ora wrappato con preconditions
 * dal registry `lib/preconditions.ts`. Toggle disabilitato + tooltip italiano
 * quando i risultati richiesti mancano. Click su disabled propone azione
 * (es. "Esegui analisi statica") tramite useRunAnalysis.
 */
import { useResultsStore } from "../../../store/resultsStore";
import { useAnalysisStore } from "../../../store/analysisStore";
import { useRunAnalysis } from "../../../hooks/useAnalysis";
import { useFeaturePreconditionState } from "../../../hooks/usePreconditions";
import { checkFeature, type FeatureId } from "../../../lib/preconditions";
import { Tooltip } from "../../ui/Tooltip";


/**
 * v2.5.7: Toggle ora supporta `disabled` + `tooltip`. Il wrapper esterno
 * è un `<label>` per accessibilità; quando disabled, il click sul label NON
 * triggera l'onChange dell'input, ma triggera onDisabledClick se fornito
 * (pattern propose-action coerente con FeatureButton).
 */
function Toggle({
  label, description, checked, onChange, testId,
  disabled = false, tooltip, onDisabledClick,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: () => void;
  testId?: string;
  disabled?: boolean;
  tooltip?: React.ReactNode;
  onDisabledClick?: () => void;
}) {
  const handleClick: React.MouseEventHandler<HTMLLabelElement> = (e) => {
    if (disabled) {
      e.preventDefault();
      if (onDisabledClick) onDisabledClick();
    }
  };
  const labelEl = (
    <label
      className={`flex items-start gap-2 py-1.5 rounded px-1.5 -mx-1.5 ${
        disabled
          ? "cursor-not-allowed opacity-50"
          : "cursor-pointer hover:bg-bg-hover"
      }`}
      onClick={handleClick}
      data-feature-available={!disabled}
    >
      <input
        type="checkbox"
        checked={checked && !disabled}
        onChange={disabled ? undefined : onChange}
        disabled={disabled}
        data-testid={testId}
        className="mt-0.5 accent-accent"
      />
      <div className="min-w-0 flex-1">
        <div className="text-xs font-medium">{label}</div>
        {description && <div className="text-[11px] text-ink-3">{description}</div>}
      </div>
    </label>
  );
  if (!tooltip) return labelEl;
  return <Tooltip content={tooltip}>{labelEl}</Tooltip>;
}


export function ViewPanelContent() {
  const showDeformed = useResultsStore((s) => s.showDeformed);
  const toggleDeformed = useResultsStore((s) => s.toggleDeformed);
  const showStressColormap = useResultsStore((s) => s.showStressColormap);
  const toggleStress = useResultsStore((s) => s.toggleStressColormap);
  const showIso = useResultsStore((s) => s.showIsosurfaces);
  const toggleIso = useResultsStore((s) => s.toggleIsosurfaces);
  const deformedScale = useResultsStore((s) => s.deformedScale);
  const setDeformedScale = useResultsStore((s) => s.setDeformedScale);

  // v2.5.7 cluster A: check delle precondizioni per ogni toggle View.
  const state = useFeaturePreconditionState();
  const setAnalysisType = useAnalysisStore((s) => s.setAnalysisType);
  const runAnalysis = useRunAnalysis();

  function buildToggleProps(featureId: FeatureId): {
    disabled: boolean;
    tooltip: React.ReactNode | undefined;
    onDisabledClick: (() => void) | undefined;
  } {
    const av = checkFeature(featureId, state);
    if (av.available) return { disabled: false, tooltip: undefined, onDisabledClick: undefined };
    const tooltip = (
      <div className="space-y-1">
        <p>{av.disabledLabel}</p>
        {av.disabledActionLabel && (
          <p className="text-[10px] opacity-70">Click per: {av.disabledActionLabel}</p>
        )}
      </div>
    );
    const onDisabledClick = av.disabledAction === "run-static"
      ? () => { setAnalysisType("static"); runAnalysis(); }
      : av.disabledAction === "run-modal"
      ? () => { setAnalysisType("modal"); runAnalysis(); }
      : undefined;
    return { disabled: true, tooltip, onDisabledClick };
  }

  const deformedGuard = buildToggleProps("view-deformed");
  const stressGuard = buildToggleProps("view-stress-colormap");
  const isoGuard = buildToggleProps("view-isosurfaces");

  return (
    <div className="space-y-4">
      <section>
        <h3 className="text-[10px] font-semibold uppercase tracking-wider text-ink-3 mb-2">
          Overlay risultati
        </h3>
        <Toggle
          label="Deformata"
          description="Mostra spostamenti applicati al modello"
          checked={showDeformed}
          onChange={toggleDeformed}
          testId="view-toggle-deformed"
          {...deformedGuard}
        />
        <Toggle
          label="Colormap stress"
          description="Sigma Von Mises sui beam/shell"
          checked={showStressColormap}
          onChange={toggleStress}
          testId="view-toggle-stress"
          {...stressGuard}
        />
        <Toggle
          label="Iso-superfici 3D"
          description="Estratto da dynamic / modal (BL-7)"
          checked={showIso}
          onChange={toggleIso}
          testId="view-toggle-iso"
          {...isoGuard}
        />
      </section>

      <section className="pt-3 border-t border-border">
        <h3 className="text-[10px] font-semibold uppercase tracking-wider text-ink-3 mb-2">
          Scala deformata
        </h3>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={1}
            max={1000}
            step={1}
            value={deformedScale}
            onChange={(e) => setDeformedScale(Number(e.target.value))}
            className="flex-1 accent-accent"
            data-testid="view-deformed-scale"
          />
          <span className="text-xs numeric w-12 text-right">×{deformedScale}</span>
        </div>
      </section>

      <div className="pt-2 border-t border-border text-[11px] text-ink-3 leading-relaxed">
        <span className="chip chip-info text-[10px] mr-1">tip</span>
        Le opzioni si applicano al viewport 3D principale.
      </div>
    </div>
  );
}
