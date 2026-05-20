/**
 * API auto-detection problemi modello — FASE 23.
 * Backend: `GET /api/models/{id}/auto-detect`.
 *
 * 5 detector implementati:
 *   1. duplicate_elements   — stessi nodi (frozenset)
 *   2. coincident_nodes     — coord identiche entro tol
 *   3. orphan_loads         — carichi che puntano a nodi/elementi inesistenti
 *   4. missing_section      — beam senza section_id
 *   5. winkler_jump         — variazione winkler_k > 100× tra elementi adiacenti
 */
import { api } from "./client";

export type AutoDetectCode =
  | "DUPLICATE_ELEMENTS"
  | "COINCIDENT_NODES"
  | "ORPHAN_LOADS"
  | "MISSING_SECTION"
  | "WINKLER_JUMP";

export interface AutoDetectIssue {
  level: "info" | "warning" | "error";
  code: AutoDetectCode;
  message: string;
  suggested_fix: string;
  entity_type: "node" | "element" | "load" | "constraint" | null;
  entity_ids: number[];
}

export interface AutoDetectReport {
  model_id: string;
  n_issues: number;
  issues: AutoDetectIssue[];
}

export const autoDetectApi = {
  run: (modelId: string) =>
    api.get<AutoDetectReport>(`/api/models/${modelId}/auto-detect`)
       .then(r => r.data),
};
