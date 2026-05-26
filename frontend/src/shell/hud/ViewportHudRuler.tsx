// v2.6.2 Shell · HUD Ruler (bottom-left)
// Scale indicator dinamico. In Fase 2: rendering UI nuovo + lettura
// `viewportCameraStore.metersPerScreenHeight` (v2.5.7 ScaleIndicator).
// Quando il vero ScaleIndicator R3F verrà rimosso dal Canvas, questo
// componente lo sostituisce visualmente.

import { useViewportCameraStore } from "../../store/viewportCameraStore";

function chooseScale(metersPerScreenHeight: number): { label: string; meters: number } {
  // 8 break dinamici (parità di logica con ScaleIndicator v2.5.7)
  const breaks = [
    { meters: 0.01, label: "10 mm" },
    { meters: 0.05, label: "50 mm" },
    { meters: 0.1, label: "100 mm" },
    { meters: 0.5, label: "0.5 m" },
    { meters: 1, label: "1 m" },
    { meters: 5, label: "5 m" },
    { meters: 10, label: "10 m" },
    { meters: 50, label: "50 m" },
  ];
  // Pick the break closest to ~10% of screen height
  const target = metersPerScreenHeight * 0.1;
  let best = breaks[0];
  for (const b of breaks) {
    if (b.meters <= target * 2) best = b;
  }
  return best;
}

export function ViewportHudRuler() {
  const metersPerH = useViewportCameraStore((s) => s.metersPerScreenHeight);
  const scale = chooseScale(metersPerH || 1);

  return (
    <div className="vp-hud vp-ruler" aria-label={`Scala ${scale.label}`} data-hud="ruler">
      <span>{scale.label}</span>
      <span className="vp-ruler-bar" />
      <span>Zoom 100%</span>
    </div>
  );
}
