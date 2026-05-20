/**
 * Billing store (Sprint 1 — A4).
 *
 * `skipCostPreview` persiste in localStorage; il resto e' transiente.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CostEstimate } from "../api/billing";

interface BillingState {
  skipCostPreview: boolean;
  setSkipCostPreview: (v: boolean) => void;
  lastEstimate: CostEstimate | null;
  setLastEstimate: (e: CostEstimate | null) => void;
}

export const useBillingStore = create<BillingState>()(
  persist(
    (set) => ({
      skipCostPreview: false,
      setSkipCostPreview: (v) => set({ skipCostPreview: v }),
      lastEstimate: null,
      setLastEstimate: (e) => set({ lastEstimate: e }),
    }),
    {
      name: "billing-store",
      partialize: (s) => ({ skipCostPreview: s.skipCostPreview }),
    },
  ),
);
