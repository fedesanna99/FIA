/**
 * ScaleIndicator — pillola scala viewport (mockup v1.3).
 *
 * In basso a sinistra del viewport mostra "1 m · 1:N" con un piccolo
 * simbolo a U che rappresenta la barra di scala. La stima di scala
 * deriva dalla `size` del bounding box del modello attivo.
 */
import { useModelStore } from "../../store/modelStore";
import { modelBounds } from "../../utils/geometry";

export function ScaleIndicator() {
  const model = useModelStore((s) => s.model);
  if (!model) return null;

  const bounds = modelBounds(model);
  const size = bounds.size;
  const scaleStr =
    size > 50 ? "1:200" : size > 10 ? "1:50" : size > 2 ? "1:20" : "1:5";

  return (
    <div className="absolute bottom-3.5 left-3.5 z-10 bg-bg-elevated border border-border-light px-2.5 py-1.5 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-wide-1 text-ink-3 shadow-pop pointer-events-none font-semibold">
      <span className="inline-block w-12 h-1 border-l border-r border-b border-ink-3" />
      <span className="tabular-nums normal-case tracking-normal">1 m · {scaleStr}</span>
    </div>
  );
}
