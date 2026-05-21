/**
 * applyClimateLoads — helper puro che genera Load entries dal ClimateBundle.
 *
 * Modalita' tributary area (v1.4.0-alpha.6):
 *   - "uniform" (default, backward compat): magnitudo = q × tributary_area
 *     COSTANTE per ogni nodo. Veloce, stima preliminare.
 *   - "per-node": chiama computeTributaryAreas(model, facade_width) e
 *     applica magnitudo SPECIFICA per ogni nodo = q × tributary[i].
 *     Scientificamente difendibile, mostra min/max nel risultato.
 *
 * Logica:
 *   - per ogni nodo NON vincolato (skipConstrained=true default),
 *   - aggiunge 1 carico verticale -Z (snow) e/o 1 carico ±X/±Y (wind)
 *   - Label EN1991-1-3/4 con nome location per traceability
 */
import type { Load, FEAModel } from "../types/model";

import type { ClimateBundle } from "../store/climateStore";
import { computeTributaryAreas } from "./tributaryAreas";


export type WindDirection = "+X" | "-X" | "+Y" | "-Y";
export type TributaryMode = "uniform" | "per-node";


export interface ApplyClimateOptions {
  includeWind: boolean;
  includeSnow: boolean;
  windDirection: WindDirection;
  /** Modalita' calcolo area di influenza. "uniform" usa `tributaryArea`
   * costante per ogni nodo; "per-node" deriva da topologia (chiama
   * computeTributaryAreas) e applica magnitudo specifica per nodo. */
  tributaryMode: TributaryMode;
  /** Area di influenza uniforme [m²]. Usata SOLO se tributaryMode="uniform". */
  tributaryArea: number;
  /** Facade width [m] per beam→area conversion. Usata SOLO in "per-node". */
  facadeWidthM: number;
  /** Salta i nodi vincolati. Default true (no senso caricare un appoggio). */
  skipConstrained: boolean;
}


export const DEFAULT_APPLY_OPTIONS: ApplyClimateOptions = {
  includeWind: true,
  includeSnow: true,
  windDirection: "+X",
  tributaryMode: "uniform",
  tributaryArea: 1.0,
  facadeWidthM: 1.0,
  skipConstrained: true,
};


export interface ApplyClimateResult {
  loads: Omit<Load, "id">[];
  /** Quanti nodi sono stati caricati. */
  n_nodes_loaded: number;
  /** Quanti nodi sono stati saltati (vincolati o tributary=0). */
  n_nodes_skipped: number;
  /** Magnitudo wind in kN. In "uniform" e' identica per ogni nodo; in
   * "per-node" e' il VALORE MEDIO sui nodi caricati. */
  wind_force_kN: number;
  snow_force_kN: number;
  /** Solo in "per-node": magnitudo wind min/max sui nodi caricati. */
  wind_force_min_kN?: number;
  wind_force_max_kN?: number;
  /** Solo in "per-node": magnitudo snow min/max. */
  snow_force_min_kN?: number;
  snow_force_max_kN?: number;
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

  // Pre-compute tributary map se modalita' per-node
  const tributaryByNode =
    opts.tributaryMode === "per-node"
      ? computeTributaryAreas(model, opts.facadeWidthM).by_node
      : null;

  const windAxis = opts.windDirection.replace(/[+-]/, "") as "X" | "Y";
  const windSign = opts.windDirection.startsWith("-") ? -1 : 1;
  const q_p = bundle.meteo.wind.q_p_z10_kN_m2;
  const s_d = bundle.meteo.snow.s_design_kN_m2;

  const loads: Omit<Load, "id">[] = [];
  let nodesLoaded = 0;
  let nodesSkipped = 0;
  const windForces: number[] = [];
  const snowForces: number[] = [];
  const locLabel = bundle.location.name;

  for (const node of model.nodes) {
    if (opts.skipConstrained && constrainedIds.has(node.id)) {
      nodesSkipped++;
      continue;
    }

    // Determine effective area for THIS node
    let nodeArea: number;
    if (tributaryByNode) {
      nodeArea = tributaryByNode.get(node.id)?.tributary_area_m2 ?? 0;
      if (nodeArea <= 0) {
        // Nodo isolato (no element adiacenti): skip in per-node mode
        nodesSkipped++;
        continue;
      }
    } else {
      nodeArea = opts.tributaryArea;
    }

    const nodeSnowForce = opts.includeSnow ? s_d * nodeArea : 0;
    const nodeWindForce = opts.includeWind ? q_p * nodeArea : 0;

    if (opts.includeSnow && nodeSnowForce > 0) {
      loads.push({
        type: "nodal",
        target_id: node.id,
        fz: -nodeSnowForce,
        label: `Snow EN1991-1-3 [${locLabel}]`,
      });
      snowForces.push(nodeSnowForce);
    }

    if (opts.includeWind && nodeWindForce > 0) {
      const force = windSign * nodeWindForce;
      loads.push({
        type: "nodal",
        target_id: node.id,
        ...(windAxis === "X" ? { fx: force } : { fy: force }),
        label: `Wind EN1991-1-4 [${locLabel}, ${opts.windDirection}]`,
      });
      windForces.push(nodeWindForce);
    }

    if (
      (opts.includeWind && nodeWindForce > 0) ||
      (opts.includeSnow && nodeSnowForce > 0)
    ) {
      nodesLoaded++;
    }
  }

  const result: ApplyClimateResult = {
    loads,
    n_nodes_loaded: nodesLoaded,
    n_nodes_skipped: nodesSkipped,
    wind_force_kN:
      windForces.length > 0
        ? windForces.reduce((a, b) => a + b, 0) / windForces.length
        : 0,
    snow_force_kN:
      snowForces.length > 0
        ? snowForces.reduce((a, b) => a + b, 0) / snowForces.length
        : 0,
  };

  // Min/max stats solo in modalita' per-node (rilevante)
  if (opts.tributaryMode === "per-node") {
    if (windForces.length > 0) {
      result.wind_force_min_kN = Math.min(...windForces);
      result.wind_force_max_kN = Math.max(...windForces);
    }
    if (snowForces.length > 0) {
      result.snow_force_min_kN = Math.min(...snowForces);
      result.snow_force_max_kN = Math.max(...snowForces);
    }
  }

  return result;
}
