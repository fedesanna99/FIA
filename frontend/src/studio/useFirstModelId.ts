/**
 * useFirstModelId · v2.9.0 Sprint B helper
 *
 * Hook condiviso dalle 4 Studio workspace per ottenere il modelId attivo.
 * MVP: usa il primo modello dell'utente. Iter futuri: integrare con
 * useModelStore quando saremo dentro l'App.tsx Shell flow.
 *
 * Returns:
 *   { modelId: string | null, isLoading: boolean, models: FEAModel[] }
 *
 * Quando modelId  null, le mutation handler dovrebbero mostrare toast
 * "Apri prima un modello dalla gallery Templates".
 */
import { useQuery } from "@tanstack/react-query";
import { modelsApi } from "../api/client";

export function useFirstModelId() {
  const query = useQuery({
    queryKey: ["models"],
    queryFn: () => modelsApi.list(),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const models = query.data ?? [];
  const modelId = models.length > 0 ? models[0].id : null;

  return {
    modelId,
    models,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
