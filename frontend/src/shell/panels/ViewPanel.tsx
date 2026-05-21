/**
 * ViewPanel (Sprint 5 G11 / alpha.26) — brief v1.2.1 Step 7.5.
 *
 * Macro-panel "View" rail destro: NESSUN tab, toggle list per overlay
 * del viewport (deformata, stress, iso, drift, ecc.).
 */
import { IconEye } from "@tabler/icons-react";
import clsx from "clsx";
import { useWorkspaceStore } from "../../store/workspaceStore";
import { useRightRailStore } from "../../store/rightRailStore";
import { useResultsStore } from "../../store/resultsStore";
import { PanelChrome } from "./PanelChrome";


export function ViewPanel() {
  const closeRight = useWorkspaceStore((s) => s.closeRightPanel);
  const closeRail = useRightRailStore((s) => s.close);

  const showDeformed = useResultsStore((s) => s.showDeformed);
  const toggleDeformed = useResultsStore((s) => s.toggleDeformed);
  const showStress = useResultsStore((s) => s.showStressColormap);
  const toggleStress = useResultsStore((s) => s.toggleStressColormap);
  const showIso = useResultsStore((s) => s.showIsosurfaces);
  const toggleIso = useResultsStore((s) => s.toggleIsosurfaces);
  const deformedScale = useResultsStore((s) => s.deformedScale);
  const setDeformedScale = useResultsStore((s) => s.setDeformedScale);

  function handleClose() {
    closeRight();
    closeRail();
  }

  return (
    <PanelChrome
      side="right"
      title="View"
      Icon={IconEye}
      subtitle="Layer e display"
      onClose={handleClose}
      testId="panel-view"
    >
      <div className="p-3 space-y-4">
        <Section title="Risultati overlay">
          <Toggle
            label="Deformata"
            description="Mostra spostamenti applicati al modello"
            checked={showDeformed}
            onChange={toggleDeformed}
            testId="view-toggle-deformed"
          />
          <Toggle
            label="Colormap σ Von Mises"
            description="Stress mappati su beam/shell"
            checked={showStress}
            onChange={toggleStress}
            testId="view-toggle-stress"
          />
          <Toggle
            label="Iso-superfici 3D"
            description="Estratte da modale/dynamic (BL-7)"
            checked={showIso}
            onChange={toggleIso}
            testId="view-toggle-iso"
          />
        </Section>

        <Section title={`Scala deformata · ×${deformedScale}`}>
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
            <span>×1</span>
            <span>×500</span>
            <span>×1000</span>
          </div>
        </Section>

        <div className="pt-2 border-t border-border text-[11px] text-ink-muted leading-relaxed">
          <span className="chip chip-info text-[10px] mr-1">tip</span>
          Le opzioni si applicano al viewport 3D principale.
        </div>
      </div>
    </PanelChrome>
  );
}


function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-[10px] uppercase tracking-wider text-ink-muted font-semibold mb-2">
        {title}
      </h3>
      {children}
    </section>
  );
}


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
    <label
      className={clsx(
        "flex items-start gap-2 py-1.5 px-2 -mx-2 cursor-pointer rounded transition-colors",
        "hover:bg-bg-hover",
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        data-testid={testId}
        className="mt-0.5 accent-accent"
      />
      <div className="min-w-0 flex-1">
        <div className="text-xs font-medium">{label}</div>
        {description && <div className="text-[11px] text-ink-muted">{description}</div>}
      </div>
    </label>
  );
}
