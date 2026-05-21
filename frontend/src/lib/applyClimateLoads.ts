/**
 * applyClimateLoads — helper puro che genera Load entries dal ClimateBundle.
 *
 * Logica v1.4.0-alpha.4 (semplificata — first step closure loop B):
 *   - per ogni nodo NON vincolato del modello (skipConstrained=true default),
 *   - aggiunge 1 carico verticale -Z = -s_design * tributary_area (kN)
 *     [se includeSnow]
 *   - aggiunge 1 carico orizzontale ±X o ±Y = q_p_z10 * tributary_area (kN)
 *     [se includeWind, direzione configurabile]
 *
 * NOTA: tributary_area = 1.0 m² default e' una *stima preliminare*. Per
 * progetto reale il professionista deve definire la facade area /
 * tributary area per ogni nodo. Future enhancement v1.5: parse del
 * modello per derivare tributary lengths/areas automaticamente.
 */
import type { Load, FEAModel } from "../types/model";

import type { ClimateBundle } from "../store/climateStore";


export type WindDirection = "+X" | "-X" | "+Y" | "-Y";


export interface ApplyClimateOptions {
  includeWind: boolean;
  includeSnow: boolean;
  windDirection: WindDirection;
  /** Area di influenza per nodo in m². Magnitudo carico = q × tributaryArea. */
  tributaryArea: number;
  /** Salta i nodi vincolati. Default true (no senso caricare un appoggio). */
  skipConstrained: boolean;
}


export const DEFAULT_APPLY_OPTIONS: ApplyClimateOptions = {
  includeWind: true,
  includeSnow: true,
  windDirection: "+X",
  tributaryArea: 1.0,
  skipConstrained: true,
};


export interface ApplyClimateResult {
  loads: Omit<Load, "id">[];
  /** Quanti nodi sono stati caricati. */
  n_nodes_loaded: number;
  /** Quanti nodi sono stati saltati (vincolati). */
  n_nodes_skipped: number;
  /** Magnitudo wind in kN (= q_p · area). 0 se !includeWind. */
  wind_force_kN: number;
  /** Magnitudo snow in kN (= s_design · area). 0 se !includeSnow. */
  snow_force_kN: number;
}


export function applyClimateLoadsToModel(
  model: FEAModel,
  bundle: ClimateBundle,
  options: Partial<ApplyClimateOptions> = {},
): ApplyClimateResult {
  const opts: ApplyClimateOptions = { ...DEFAULT_APPLY_OPTIONS, ...options };

  if (!bundle.meteo) {
    return {
      loads: [],
      n_nodes_loaded: 0,
      n_nodes_skipped: 0,
      wind_force_kN: 0,
      snow_force_kN: 0,
    };
  }

  // Map dei nodi vincolati
  const constrainedIds = new Set<number>(
    (model.constraints ?? []).map((c) => c.node_id),
  );

  const windAxis = opts.windDirection.replace(/[+-]/, "") as "X" | "Y";
  const windSign = opts.windDirection.startsWith("-") ? -1 : 1;
  const windForce = opts.includeWind
    ? bundle.meteo.wind.q_p_z10_kN_m2 * opts.tributaryArea
    : 0;
  const snowForce = opts.includeSnow
    ? bundle.meteo.snow.s_design_kN_m2 * opts.tributaryArea
    : 0;

  const loads: Omit<Load, "id">[] = [];
  let nodesLoaded = 0;
  let nodesSkipped = 0;
  const locLabel = bundle.location.name;

  for (const node of model.nodes) {
    if (opts.skipConstrained && constrainedIds.has(node.id)) {
      nodesSkipped++;
      continue;
    }

    if (opts.includeSnow && snowForce > 0) {
      loads.push({
        type: "nodal",
        target_id: node.id,
        fz: -snowForce, // verso il basso
        label: `Snow EN1991-1-3 [${locLabel}]`,
      });
    }

    if (opts.includeWind && windForce > 0) {
      const force = windSign * windForce;
      loads.push({
        type: "nodal",
        target_id: node.id,
        ...(windAxis === "X" ? { fx: force } : { fy: force }),
        label: `Wind EN1991-1-4 [${locLabel}, ${opts.windDirection}]`,
      });
    }

    if (
      (opts.includeWind && windForce > 0) ||
      (opts.includeSnow && snowForce > 0)
    ) {
      nodesLoaded++;
    }
  }

  return {
    loads,
    n_nodes_loaded: nodesLoaded,
    n_nodes_skipped: nodesSkipped,
    wind_force_kN: windForce,
    snow_force_kN: snowForce,
  };
}
