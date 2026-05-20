import { useAnalysisStore } from "../../store/analysisStore";
import { useResultsStore } from "../../store/resultsStore";

export function ViewportControls() {
  const {
    viewportMode, setViewportMode,
    showGrid, toggleGrid,
    showLoads, toggleLoads,
    showConstraints, toggleConstraints,
    showNodeLabels, toggleNodeLabels,
    showDiagrams, toggleDiagrams,
    diagramComponent, setDiagramComponent,
    showPrincipals, togglePrincipals,
    projection, setProjection,
  } = useAnalysisStore();
  const {
    deformedScale, setDeformedScale,
    showDeformed, toggleDeformed,
    showStressColormap, toggleStressColormap,
    modeAnimating, setModeAnimating,
    modeAnimAmplitude, setModeAnimAmplitude,
    selectedModeIndex, setSelectedModeIndex,
    modalResults,
    dynamicResults,
    showDynamicAnimation, toggleDynamicAnimation,
  } = useResultsStore();

  return (
    <div className="p-3 text-xs space-y-4">
      <section>
        <div className="panel-header pl-0 border-b-0 mb-2">Modo vista</div>
        <div className="grid grid-cols-3 gap-1">
          {(["wireframe", "solid", "transparent"] as const).map((m) => (
            <button
              key={m}
              className={`btn ${viewportMode === m ? "btn-primary" : ""}`}
              onClick={() => setViewportMode(m)}
            >
              {m === "wireframe" ? "Wire" : m === "solid" ? "Solid" : "Transp"}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-1 mt-2">
          {(["perspective", "orthographic"] as const).map((p) => (
            <button
              key={p}
              className={`btn ${projection === p ? "btn-primary" : ""}`}
              onClick={() => setProjection(p)}
              title={p === "perspective" ? "Camera prospettica" : "Camera ortografica"}
            >
              {p === "perspective" ? "Prospettica" : "Ortografica"}
            </button>
          ))}
        </div>
      </section>

      <section>
        <div className="panel-header pl-0 border-b-0 mb-2">Visibilità</div>
        <div className="space-y-1">
          <Toggle label="Griglia" value={showGrid} onChange={toggleGrid} />
          <Toggle label="Carichi" value={showLoads} onChange={toggleLoads} />
          <Toggle label="Vincoli" value={showConstraints} onChange={toggleConstraints} />
          <Toggle label="Etichette nodi" value={showNodeLabels} onChange={toggleNodeLabels} />
        </div>
      </section>

      <section>
        <div className="panel-header pl-0 border-b-0 mb-2">Risultati</div>
        <div className="space-y-2">
          <Toggle label="Deformata" value={showDeformed} onChange={toggleDeformed} />
          <Toggle label="Stress colormap" value={showStressColormap} onChange={toggleStressColormap} />
          <Toggle label="Diagramma N/V/M" value={showDiagrams} onChange={toggleDiagrams} />
          <Toggle label="Tensioni principali σ₁/σ₂" value={showPrincipals} onChange={togglePrincipals} />
          {showPrincipals && (
            <div className="text-[10px] text-ink-dim leading-snug pl-4">
              <span className="text-accent-danger">─</span> trazione  ·{" "}
              <span className="text-accent-primary">─</span> compressione
            </div>
          )}
          {showDiagrams && (
            <div className="grid grid-cols-3 gap-1 mt-1">
              {(["N", "V", "M"] as const).map((c) => (
                <button
                  key={c}
                  className={`btn ${diagramComponent === c ? "btn-primary" : ""}`}
                  onClick={() => setDiagramComponent(c)}
                >{c}</button>
              ))}
            </div>
          )}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="label">Scala deformata</span>
              <span className="numeric text-accent-primary">{deformedScale}×</span>
            </div>
            <input
              type="range" min={1} max={2000} step={10}
              value={deformedScale}
              onChange={(e) => setDeformedScale(Number(e.target.value))}
              className="w-full"
            />
          </div>
        </div>
      </section>

      {dynamicResults && (
        <section>
          <div className="panel-header pl-0 border-b-0 mb-2">Risposta dinamica</div>
          <Toggle label="Anima nel tempo" value={showDynamicAnimation} onChange={toggleDynamicAnimation} />
          <div className="text-[10px] text-ink-dim mt-1 leading-snug">
            Usa la timeline in fondo al viewport per play/pausa e scrubbing.
          </div>
        </section>
      )}

      {modalResults && (
        <section>
          <div className="panel-header pl-0 border-b-0 mb-2">Forme modali</div>
          <div className="space-y-2">
            <select
              className="input"
              value={selectedModeIndex}
              onChange={(e) => setSelectedModeIndex(Number(e.target.value))}
            >
              {modalResults.modes.map((m, i) => (
                <option key={m.mode} value={i}>
                  Modo {m.mode} — {m.frequency_hz.toFixed(3)} Hz
                </option>
              ))}
            </select>
            <Toggle
              label="Anima modo"
              value={modeAnimating}
              onChange={() => setModeAnimating(!modeAnimating)}
            />
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="label">Ampiezza</span>
                <span className="numeric text-accent-primary">{modeAnimAmplitude.toFixed(2)}</span>
              </div>
              <input
                type="range" min={0.05} max={2} step={0.05}
                value={modeAnimAmplitude}
                onChange={(e) => setModeAnimAmplitude(Number(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: () => void }) {
  return (
    <label className="flex items-center justify-between cursor-pointer">
      <span>{label}</span>
      <button
        onClick={onChange}
        className={`w-8 h-4 rounded-full transition relative ${value ? "bg-accent-primary" : "bg-border"}`}
      >
        <span
          className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition ${
            value ? "left-4" : "left-0.5"
          }`}
        />
      </button>
    </label>
  );
}
