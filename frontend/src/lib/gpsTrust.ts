/**
 * gpsTrust.ts (v1.9.1 T1) — helper deterministici per GPS Strutturale +
 * Trust Layer estratti da `ModelInfoCard` e `ResultsOverviewCard` per
 * test unit dedicati.
 *
 * Nessuno stato: pure functions con input → output testabili senza
 * mount React.
 */

// ─── Trust Layer ────────────────────────────────────────────────────

export type TrustOrigin = "user" | "template" | "imported" | "ai";

/**
 * Inferisce l'origine del modello dal suo id pattern.
 *
 *  - "ai_*"             → "ai"        (AI-generated, futuro)
 *  - "ex_*"             → "template"  (template didattico backend)
 *  - "imp_*" / "dxf_*" / "ifc_*" → "imported"
 *  - tutto il resto     → "user"      (creato dall'utente, fidato)
 */
export function inferTrustOrigin(id: string): TrustOrigin {
  if (id.startsWith("ai_")) return "ai";
  if (id.startsWith("ex_")) return "template";
  if (id.startsWith("imp_") || id.startsWith("dxf_") || id.startsWith("ifc_")) {
    return "imported";
  }
  return "user";
}

// ─── GPS Strutturale (UC verifiche) ─────────────────────────────────

export type CheckTone = "ok" | "warn" | "critical";

/**
 * Mapping deterministico tra ratio UC e tonalità badge.
 *
 *   UC < 0.7      → "ok"        (verde)
 *   0.7 ≤ UC < 1  → "warn"      (giallo)
 *   UC ≥ 1.0      → "critical"  (rosso)
 *
 * Soglie scelte per essere uniformi tra S275 / EC3 / NTC nel
 * `ResultsOverviewCard`. Tutti i valori sono PURAMENTE VISIVI: non
 * sostituiscono verifica strutturale formale.
 */
export function toneFromUc(uc: number): CheckTone {
  if (uc >= 1.0) return "critical";
  if (uc >= 0.7) return "warn";
  return "ok";
}

/** Soglie normative didattiche usate dal GPS card (MPa). */
export const GPS_FYD: Record<string, number> = {
  s275: 275,
  ec3:  235,
  ntc:  261,  // S275 con γM0 = 1.05 → fyd ≈ 261.9 MPa
};
