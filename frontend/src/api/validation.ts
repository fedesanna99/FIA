/**
 * Validation API client (v2.1.9 B3-fix).
 *
 * Wrap del backend `/api/validation/report.json` che restituisce lo schema:
 *   { generated_at, n_total, n_passed, results[] }
 * dove ogni result è un benchmark NAFEMS/Analytical eseguito vs target teorico.
 *
 * Sostituisce la lista hardcoded di 3 voci che era in `ValidationView.tsx`
 * prima del fix di audit (i test live mostravano 5 benchmark passati ma la UI
 * ne mostrava solo 3 "PASS" cablati).
 */
import { api } from "./client";


export interface BenchmarkResult {
  id: string;
  family: string;
  description: string;
  target_value: number;
  target_unit: string;
  tolerance_pct: number;
  actual_value: number;
  error_pct: number;
  passed: boolean;
  reference_url: string | null;
}


export interface ValidationReport {
  generated_at: number;
  n_total: number;
  n_passed: number;
  results: BenchmarkResult[];
}


export const validationApi = {
  /** Fetcha il report JSON dal backend (cache backend TTL 1h di default). */
  getReport: () =>
    api.get<ValidationReport>("/api/validation/report.json").then((r) => r.data),
};
