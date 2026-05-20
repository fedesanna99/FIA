import * as THREE from "three";

/**
 * Mappa un valore normalizzato [0,1] sulla colormap Jet (blu→ciano→verde→giallo→rosso).
 */
export function jet(value: number): THREE.Color {
  const v = Math.max(0, Math.min(1, value));
  const fourValue = 4 * v;
  const r = Math.max(0, Math.min(1, Math.min(fourValue - 1.5, -fourValue + 4.5)));
  const g = Math.max(0, Math.min(1, Math.min(fourValue - 0.5, -fourValue + 3.5)));
  const b = Math.max(0, Math.min(1, Math.min(fourValue + 0.5, -fourValue + 2.5)));
  return new THREE.Color(r, g, b);
}

export function jetHex(value: number): string {
  return "#" + jet(value).getHexString();
}

/**
 * Mappa un range [minV, maxV] -> [0,1] e ritorna colore Jet.
 */
export function mapToJet(value: number, minV: number, maxV: number): THREE.Color {
  if (maxV === minV) return jet(0.5);
  return jet((value - minV) / (maxV - minV));
}
