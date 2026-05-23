/**
 * ViewPanelContent — alpha.17.
 *
 * Toggle layer-visibility nel viewport. In alpha.20 sostituira' la parte
 * "View options" del Results workspace. Per ora pesca direttamente dai
 * resultsStore / uiStore esistenti.
 */
import { useResultsStore } from "../../../store/resultsStore";


function Toggle({
  label, description, checked, onChange, testId,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: () => void;
  testId?: string;
}) {
  return (
    <label className="flex items-start gap-2 py-1.5 cursor-pointer hover:bg-bg-hover rounded px-1.5 -mx-1.5">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        data-testid={testId}
        className="mt-0.5 accent-accent"
      />
      <div className="min-w-0 flex-1">
        <div className="text-xs font-medium">{label}</div>
        {description && <div className="text-[11px] text-ink-3">{description}</div>}
      </div>
    </label>
  );
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
        />
        <Toggle
          label="Colormap stress"
          description="Sigma Von Mises sui beam/shell"
          checked={showStressColormap}
          onChange={toggleStress}
          testId="view-toggle-stress"
        />
        <Toggle
          label="Iso-superfici 3D"
          description="Estratto da dynamic / modal (BL-7)"
          checked={showIso}
          onChange={toggleIso}
          testId="view-toggle-iso"
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
