/**
 * ScaleIndicator — pillola scala viewport (mockup v1.3).
 *
 * In basso a sinistra del viewport mostra "1 m · 1:N".
 *
 * v2.5.7 cluster A (BUG-043): scala ora DINAMICA in funzione del camera zoom
 * (non più hardcoded sui bounds del modello). Legge `metersPerScreenHeight`
 * dal `viewportCameraStore`, popolato da `CameraTracker` (sub-componente
 * R3F dentro Canvas, update 10Hz). 8 break-step da 1:2 a 1:1000 invece dei 4
 * originali. Fallback su bounds del modello finché il tracker non pubblica.
 */
import { useModelStore } from "../../store/modelStore";
import { useViewportCameraStore } from "../../store/viewportCameraStore";
import { modelBounds } from "../../utils/geometry";

/**
 * Esportata per test. Sceglie l'etichetta scala in base a "quanti metri reali
 * entrano nella altezza viewport". Soglie pensate per modelli civili
 * (qualche metro → centinaia di metri). 8 break.
 */
export function pickScaleLabel(metersPerScreen: number): string {
  if (!Number.isFinite(metersPerScreen) || metersPerScreen <= 0) return "1:50";
  if (metersPerScreen > 200) return "1:1000";
  if (metersPerScreen > 100) return "1:500";
  if (metersPerScreen > 50) return "1:200";
  if (metersPerScreen > 20) return "1:100";
  if (metersPerScreen > 10) return "1:50";
  if (metersPerScreen > 5) return "1:20";
  if (metersPerScreen > 2) return "1:10";
  return "1:5";
}

export function ScaleIndicator() {
  const model = useModelStore((s) => s.model);
  const metersPerScreenHeight = useViewportCameraStore((s) => s.metersPerScreenHeight);
  if (!model) return null;

  // Preferenza: usa il valore dinamico dal CameraTracker. Fallback su bounds
  // del modello finché il tracker non ha ancora pubblicato (boot iniziale,
  // ~1-2 frame).
  const fallback = modelBounds(model).size;
  const meters = metersPerScreenHeight ?? fallback;
  const scaleStr = pickScaleLabel(meters);

  return (
    <div className="absolute bottom-3.5 left-3.5 z-10 bg-bg-elevated border border-border-light px-2.5 py-1.5 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-wide-1 text-ink-3 shadow-pop pointer-events-none font-semibold">
      <span className="inline-block w-12 h-1 border-l border-r border-b border-ink-3" />
      <span className="tabular-nums normal-case tracking-normal">1 m · {scaleStr}</span>
    </div>
  );
}
