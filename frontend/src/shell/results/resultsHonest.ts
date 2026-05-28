// redesign/workspace-fasi · FETTA 2b · helpers "4 stati onesti"
//
// Pure functions di presentazione condivise fra ResultsVerdictStrip,
// ResultsSintesi, ResultsDati, ResultsVerifiche. Nessuna nuova logica
// di dominio: solo lettura degli store esistenti + decisioni di label.
//
// Quattro stati onesti (mai bugia visiva):
//   - "—"            → non ancora calcolato (placeholder neutro)
//   - "n/a"          → non si applica alla geometria (motivo esplicito)
//   - "warn-stima"   → c'è ma sospetto (calcolo degenere o stima non validata)
//   - "ok"           → valore vero, solido
//
// "Calcolo sospetto" trigger: hasResults && |sigma_max|<eps && |disp_max|<eps.
// Pattern di "calcolo che sussurra mettendo tutto a zero": il prodotto deve
// riconoscere l'assenza di fisica e dichiararla (modello degenere / vincoli
// insufficienti / carichi non connessi) invece di applaudire un UR=0.

import type { FEAModel, ElementType } from "../../types/model";
import type { StaticResults } from "../../types/results";
import { GPS_FYD } from "../../lib/gpsTrust";

/** Soglia "tutto a zero": sotto questa magnitudine il calcolo e' sospetto. */
export const SUSPICIOUS_EPS = 1e-12;

/** Element type con sezione normata acciaio EC3 (trave/asta lineare 1D). */
const EC3_NORMED_TYPES: ReadonlySet<ElementType> = new Set<ElementType>([
  "beam2d", "beam3d",
  "truss2d", "truss3d",
  "cable2d", "cable3d",
]);

/**
 * EC3 si applica al modello se ALMENO un elemento ha sezione normata
 * (beam/truss/cable). Geometrie solo-solido o solo-shell → n/a.
 */
export function isEC3Applicable(model: FEAModel | null): boolean {
  if (!model || !model.elements) return false;
  return model.elements.some((e) => EC3_NORMED_TYPES.has(e.type));
}

/**
 * "Calcolo sospetto": ha risultati ma magnitude di sigma E disp sono entrambe
 * sotto SUSPICIOUS_EPS. Non significa "errore solver" — significa "il solver
 * ha prodotto u≈0 ovunque, che fisicamente è poco plausibile per un carico
 * applicato". Tipico di vincoli insufficienti per rimuovere i modi rigidi.
 */
export function isSuspicious(staticResults: StaticResults | null): boolean {
  if (!staticResults) return false;
  const sigma = Math.abs(staticResults.max_stress ?? 0);
  const disp = Math.abs(staticResults.max_displacement ?? 0);
  return sigma < SUSPICIOUS_EPS && disp < SUSPICIOUS_EPS;
}

/** Etichetta umana del motivo "sospetto" (tooltip + banner). */
export const SUSPICIOUS_REASON =
  "Spostamenti e sforzi nulli: probabile modello degenere (vincoli insufficienti per bloccare i modi rigidi) o carichi non collegati ai nodi. Controlla il modello.";

/** Etichetta umana "EC3 n/a". */
export const EC3_NA_REASON =
  "EC3 non applicabile a questa geometria: serve almeno una trave/asta con sezione normata (S235/S275/S355). Per geometrie solide/shell consulta i valori grezzi nella tab Dati.";

/** UR EC3 calcolato live dal sigma_max (MPa) e fyd (235 MPa). */
export function computeUREC3(sigmaMaxPa: number): number {
  return (sigmaMaxPa / 1e6) / GPS_FYD.ec3;
}

/** Affidabilita' del calcolo per "famiglia" di elementi presenti nel modello. */
export type ReliabilityTone = "validated" | "estimate" | "mixed";

export interface ReliabilityBadge {
  tone: ReliabilityTone;
  label: string;
  tooltip: string;
}

/**
 * Badge "Validato / Stima" coerente con la verita' sul solver:
 *  - travi/aste/cavi: validato (benchmark trave bi-appoggiata, errore <0.1%)
 *  - piastre/shell:   stima (Q4 sottostima il bending, MITC migliore ma non
 *                     totalmente validato)
 *  - solidi:          stima (H8/T4 meno collaudati)
 *  - mixed:           se ci sono entrambi, prevale "stima" (l'anello debole)
 */
export function reliabilityFromModel(model: FEAModel | null): ReliabilityBadge {
  if (!model || !model.elements || model.elements.length === 0) {
    return {
      tone: "estimate",
      label: "—",
      tooltip: "Nessun elemento nel modello.",
    };
  }
  let hasLinear = false;
  let hasShell = false;
  let hasSolid = false;
  for (const el of model.elements) {
    if (EC3_NORMED_TYPES.has(el.type)) hasLinear = true;
    else if (el.type === "shell_q4" || el.type === "shell_q4_mitc" || el.type === "tri3") hasShell = true;
    else if (el.type === "solid_h8" || el.type === "solid_t4" || el.type === "solid_t10") hasSolid = true;
  }
  // Mixed: linear + (shell o solid) → stima dell'anello debole
  if (hasLinear && (hasShell || hasSolid)) {
    return {
      tone: "mixed",
      label: "Mista",
      tooltip: "Modello misto travi + " + (hasSolid ? "solidi" : "piastre") +
        ". Le travi/aste sono validate; gli elementi 2D/3D sono ancora stima.",
    };
  }
  if (hasLinear) {
    return {
      tone: "validated",
      label: "Validato",
      tooltip: "Travi/aste: confronto con benchmark analitici e CalculiX, errore <0.1%.",
    };
  }
  if (hasShell) {
    return {
      tone: "estimate",
      label: "Stima",
      tooltip: "Piastre/shell Q4: sottostima il bending (shear locking). La variante MITC migliora ma non e' ancora totalmente validata.",
    };
  }
  if (hasSolid) {
    return {
      tone: "estimate",
      label: "Stima",
      tooltip: "Elementi solidi H8/T4: meno collaudati. Confronto con CalculiX in corso.",
    };
  }
  return { tone: "estimate", label: "—", tooltip: "Tipo elemento non riconosciuto." };
}
