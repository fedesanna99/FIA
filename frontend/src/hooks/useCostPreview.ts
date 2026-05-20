/**
 * useCostPreview (Sprint 1 — A4).
 *
 * Wrappa: estimate + quota fetch + dialog open/close + pending action.
 * `previewAndRun(req, run)` apre il dialog (se skipPreview=false) e quando
 * l'utente conferma esegue `run()`. Se skipPreview=true, esegue `run()`
 * direttamente senza chiedere.
 */
import { useCallback, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  estimateCost,
  getQuota,
  type CostEstimate,
  type EstimateRequest,
  type UserQuota,
} from "../api/billing";
import { useBillingStore } from "../store/billingStore";


export const DEFAULT_USER_ID = "demo_user";


export function useCostPreview(userId: string = DEFAULT_USER_ID) {
  const skipPreview = useBillingStore((s) => s.skipCostPreview);
  const setLastEstimate = useBillingStore((s) => s.setLastEstimate);

  const [open, setOpen] = useState(false);
  const pendingActionRef = useRef<(() => void) | null>(null);
  const qc = useQueryClient();

  const estimateMutation = useMutation({
    mutationFn: estimateCost,
    onSuccess: (e: CostEstimate) => setLastEstimate(e),
  });

  const quotaQuery = useQuery<UserQuota>({
    queryKey: ["quota", userId],
    queryFn: () => getQuota(userId),
    staleTime: 30_000,
  });

  const previewAndRun = useCallback(
    async (req: EstimateRequest, run: () => void) => {
      if (skipPreview) {
        run();
        return;
      }
      pendingActionRef.current = run;
      setOpen(true);
      await estimateMutation.mutateAsync(req).catch(() => undefined);
    },
    [estimateMutation, skipPreview],
  );

  const confirm = useCallback(() => {
    const fn = pendingActionRef.current;
    pendingActionRef.current = null;
    setOpen(false);
    // Invalida la quota: il backend ha consumato i crediti
    qc.invalidateQueries({ queryKey: ["quota", userId] });
    fn?.();
  }, [qc, userId]);

  const cancel = useCallback(() => {
    pendingActionRef.current = null;
    setOpen(false);
  }, []);

  return {
    open,
    estimate: estimateMutation.data ?? null,
    quota: quotaQuery.data ?? null,
    isLoading: estimateMutation.isPending,
    previewAndRun,
    confirm,
    cancel,
    setOpen,
  };
}
