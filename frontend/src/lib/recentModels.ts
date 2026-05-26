/**
 * useRecentModels (v2.6.5 D.2) — hook per la sezione "Modelli recenti"
 * della home dashboard (mockup FEA_Pro · Dashboard A1).
 *
 * NB: backend `FEAModel` schema NON ha `updated_at` / `created_at` (è uno
 * snapshot immutable). Quindi NON possiamo sort by recente lato server.
 * Strategy adattiva:
 *   - Filtra modelli "user" (esclude `id.startsWith("ex_")` = template demo)
 *   - Storage preserva l'ordine di inserimento (Map iterazione = insertion order)
 *   - Slice [0..limit] dà gli ultimi N inseriti (approssima "recenti")
 *
 * Quando il backend evolverà con timestamp persistenti (v2.7+ migration),
 * questo hook potrà ordinare deterministicamente.
 */
import { useQuery } from "@tanstack/react-query";
import { modelsApi } from "../api/client";
import type { FEAModel } from "../types/model";

export interface RecentModel {
  id: string;
  name: string;
  is3d: boolean;
  nodeCount: number;
  elementCount: number;
  loadCount: number;
  constraintCount: number;
  description: string | null;
  /**
   * Status derivato lato client (no backend job/analysis tracking
   * persistente): "draft" se nodi=0, "ok" altrimenti. "running"/"error"
   * non sono derivabili senza il backend jobs feature.
   */
  status: "draft" | "ok";
}

function toRecent(m: FEAModel): RecentModel {
  const nodeCount = m.nodes?.length ?? 0;
  return {
    id: m.id,
    name: m.name,
    is3d: m.is_3d,
    nodeCount,
    elementCount: m.elements?.length ?? 0,
    loadCount: m.loads?.length ?? 0,
    constraintCount: m.constraints?.length ?? 0,
    description: m.description ?? null,
    status: nodeCount === 0 ? "draft" : "ok",
  };
}

/**
 * Ritorna i `limit` modelli utente più recenti.
 *
 * Insertion order convention: `_MODELS` Map nel backend storage preserva
 * l'ordine di save_model, quindi gli ultimi N elementi dell'array sono
 * i più recenti aggiunti. Reverse + slice per avere "recenti first".
 */
export function useRecentModels(limit: number = 4) {
  return useQuery<RecentModel[]>({
    queryKey: ["models", "recent", limit],
    queryFn: async () => {
      const all = await modelsApi.list();
      const userModels = all.filter((m) => !m.id.startsWith("ex_"));
      // Reverse (più recenti first) + slice + map
      return userModels.slice().reverse().slice(0, limit).map(toRecent);
    },
    staleTime: 30_000, // 30s cache (allineato a useModelsList esistente)
    retry: 1,
  });
}
