/**
 * Climate store (Sprint 2 follow-up — U1).
 *
 * Persiste il bundle calcolato dal LocationPickerDialog (location +
 * elevation + meteo loads + seismic loads) cosi' i valori non si
 * perdono alla chiusura del dialog e restano visibili nel widget
 * ClimateContextBadge.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { Location } from "../api/geocoding";
import type { MeteoLoadsResult, SeismicLoadsResult } from "../api/loads";


export interface ClimateBundle {
  location: Location;
  elevation_m: number | null;
  meteo: MeteoLoadsResult | null;
  seismic: SeismicLoadsResult | null;
  computed_at: number; // epoch ms, per visualizzazione "X minuti fa"
}


interface ClimateState {
  bundle: ClimateBundle | null;
  setBundle: (b: Omit<ClimateBundle, "computed_at"> | null) => void;
  clear: () => void;
}


export const useClimateStore = create<ClimateState>()(
  persist(
    (set) => ({
      bundle: null,
      setBundle: (b) => {
        if (b === null) {
          set({ bundle: null });
          return;
        }
        set({ bundle: { ...b, computed_at: Date.now() } });
      },
      clear: () => set({ bundle: null }),
    }),
    {
      name: "climate-store",
      // persiste tutto (location + loads sono piccoli, ~5KB)
    },
  ),
);
