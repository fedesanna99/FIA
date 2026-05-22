/**
 * ModelInfoCard (v1.8 T4).
 *
 * Card persistente always-on sulla shell desktop (md+), mostra info
 * sintetiche del modello attivo: nome, counts, unita', dimensione.
 *
 * Anteprima del pattern "Studio Pro sidebar destra densa" del mockup 08
 * del pacchetto v0.3 (UI Gap Analysis P1 #1). T4 introduce solo la
 * Model info card; Analysis summary + Results overview restano per
 * v1.9 (richiedono Demo Slice end-to-end).
 *
 * Si nasconde quando model = null (nessuna card vuota).
 */
import { useModelStore } from "../../store/modelStore";

export function ModelInfoCard() {
  const model = useModelStore((s) => s.model);
  if (!model) return null;

  return (
    <div
      className="border-b border-border p-3 space-y-1.5 bg-bg-panel"
      data-testid="model-info-card"
    >
      <div className="text-[10px] uppercase tracking-wider text-ink-muted font-mono font-semibold">
        Model information
      </div>
      <div
        className="text-sm font-semibold text-ink truncate"
        title={model.name}
        data-testid="model-info-name"
      >
        {model.name}
      </div>
      <div className="text-[11px] text-ink-muted leading-snug" data-testid="model-info-counts">
        {model.nodes.length} nodi · {model.elements.length} elementi
        <br />
        {model.constraints.length} vincoli · {model.loads.length} carichi
      </div>
      <div className="text-[10px] text-ink-dim font-mono">
        {model.is_3d ? "3D" : "2D"} · {model.units}
      </div>
    </div>
  );
}
