/**
 * Formattazione numerica e conversione unità di misura.
 */

export function fmt(value: number, decimals = 3): string {
  if (!Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  if (abs > 0 && (abs < 1e-3 || abs >= 1e6)) {
    return value.toExponential(Math.max(0, decimals - 1));
  }
  return value.toFixed(decimals);
}

export function fmtForce(N: number): string {
  const abs = Math.abs(N);
  if (abs >= 1e6) return `${(N / 1e6).toFixed(2)} MN`;
  if (abs >= 1e3) return `${(N / 1e3).toFixed(2)} kN`;
  return `${N.toFixed(2)} N`;
}

export function fmtStress(pa: number): string {
  const abs = Math.abs(pa);
  if (abs >= 1e9) return `${(pa / 1e9).toFixed(2)} GPa`;
  if (abs >= 1e6) return `${(pa / 1e6).toFixed(2)} MPa`;
  if (abs >= 1e3) return `${(pa / 1e3).toFixed(2)} kPa`;
  return `${pa.toFixed(2)} Pa`;
}

export function fmtLength(m: number): string {
  const abs = Math.abs(m);
  if (abs < 1e-3) return `${(m * 1e6).toFixed(1)} µm`;
  if (abs < 1.0) return `${(m * 1000).toFixed(2)} mm`;
  return `${m.toFixed(3)} m`;
}

export function fmtMass(kg: number): string {
  if (Math.abs(kg) >= 1000) return `${(kg / 1000).toFixed(2)} t`;
  return `${kg.toFixed(2)} kg`;
}
