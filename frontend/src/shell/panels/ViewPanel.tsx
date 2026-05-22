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

  // v1.6 S0 · B16: toggle "Deformata"/"Colormap" disabled finche' non
  // ci sono analysisResults. Senza dati di risultato il toggle non fa
  // nulla → l'utente non capisce. Mostriamo lo stato disabled + hint.
  const hasStaticResults = useResultsStore((s) => s.staticResults !== null);
  const hasModalResults  = useResultsStore((s) => s.modalResults !== null);
  const hasIsoData       = useResultsStore((s) => s.isosurfaceData !== null);
  const hasAnyResults    = hasStaticResults || hasModalResults;

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
            disabled={!hasStaticResults}
            disabledHint="esegui analisi statica"
            testId="view-toggle-deformed"
          />
          <Toggle
            label="Colormap σ Von Mises"
            description="Stress mappati su beam/shell"
            checked={showStress}
            onChange={toggleStress}
            disabled={!hasStaticResults}
            disabledHint="esegui analisi statica"
            testId="view-toggle-stress"
          />
          <Toggle
            label="Iso-superfici 3D"
            description="Estratte da modale/dynamic (BL-7)"
            checked={showIso}
            onChange={toggleIso}
            disabled={!hasIsoData}
            disabledHint="estrai iso da modale/dynamic"
            testId="view-toggle-iso"
          />
        </Section>

        {/* v1.6 S0 · B16: slider deformata visibile solo quando hasStatic+
            showDeformed (ha senso modulare la scala solo se la deformata
            e' effettivamente attiva). */}
        {hasStaticResults && showDeformed && (
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
        )}

        {!hasAnyResults && (
          <div className="bg-bg-info border border-info/30 rounded-md p-2.5 text-[11px] text-ink-info leading-snug">
            <strong>Esegui un'analisi</strong> per attivare gli overlay
            (deformata, stress, iso). Apri <kbd className="kbd">Solve</kbd>{" "}
            nel rail sinistro o premi <kbd className="kbd">F5</kbd>.
          </div>
        )}

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
  label, description, checked, onChange, disabled, disabledHint, testId,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  disabledHint?: string;
  testId?: string;
}) {
  return (
    <label
      className={clsx(
        "flex items-start gap-2 py-1.5 px-2 -mx-2 rounded transition-colors",
        disabled
          ? "opacity-50 cursor-not-allowed"
          : "cursor-pointer hover:bg-bg-hover",
      )}
    >
      <input
        type="checkbox"
        checked={checked && !disabled}
        onChange={() => !disabled && onChange()}
        disabled={disabled}
        data-testid={testId}
        className="mt-0.5 accent-accent disabled:cursor-not-allowed"
      />
      <div className="min-w-0 flex-1">
        <div className="text-xs font-medium flex items-center gap-1.5">
          <span>{label}</span>
          {disabled && disabledHint && (
            <span className="text-[9px] font-mono text-ink-muted bg-bg-page border border-border rounded px-1 py-px">
              {disabledHint}
            </span>
          )}
        </div>
        {description && <div className="text-[11px] text-ink-muted">{description}</div>}
      </div>
    </label>
  );
}
