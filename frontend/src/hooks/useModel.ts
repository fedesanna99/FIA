import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { modelsApi } from "../api/client";
import { useModelStore } from "../store/modelStore";
import { useResultsStore } from "../store/resultsStore";

export function useModelList() {
  return useQuery({
    queryKey: ["models"],
    queryFn: () => modelsApi.list(),
  });
}

export function useLoadModel(id: string | null) {
  const setModel = useModelStore((s) => s.setModel);
  const clearResults = useResultsStore((s) => s.clearAll);
  const query = useQuery({
    queryKey: ["model", id],
    queryFn: () => modelsApi.get(id!),
    enabled: !!id,
  });
  useEffect(() => {
    if (query.data) {
      setModel(query.data);
      clearResults();
    }
  }, [query.data, setModel, clearResults]);
  return query;
}
