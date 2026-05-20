import { create } from "zustand";
import type { StaticResults, ModalResults, DynamicResults } from "../types/results";
import type { IsosurfaceResponse } from "../api/postprocess";

interface ResultsState {
  staticResults: StaticResults | null;
  modalResults: ModalResults | null;
  dynamicResults: DynamicResults | null;
  setStatic: (r: StaticResults | null) => void;
  setModal: (r: ModalResults | null) => void;
  setDynamic: (r: DynamicResults | null) => void;

  /** Ultima estrazione iso-superfici 3D (BL-7) per rendering nel viewport. */
  isosurfaceData: IsosurfaceResponse | null;
  setIsosurfaceData: (d: IsosurfaceResponse | null) => void;
  showIsosurfaces: boolean;
  toggleIsosurfaces: () => void;

  /** Hash compatto del modello al momento dell'ultima analisi (per banner "stale"). */
  modelHashAtAnalysis: string | null;
  setModelHashAtAnalysis: (h: string | null) => void;

  deformedScale: number;
  setDeformedScale: (s: number) => void;

  showDeformed: boolean;
  toggleDeformed: () => void;

  showStressColormap: boolean;
  toggleStressColormap: () => void;

  selectedModeIndex: number;
  setSelectedModeIndex: (i: number) => void;

  modeAnimating: boolean;
  setModeAnimating: (b: boolean) => void;

  modeAnimAmplitude: number;
  setModeAnimAmplitude: (a: number) => void;

  selectedHistoryNode: number | null;
  setSelectedHistoryNode: (n: number | null) => void;

  showDynamicAnimation: boolean;
  toggleDynamicAnimation: () => void;
  dynamicAnimating: boolean;
  setDynamicAnimating: (b: boolean) => void;
  dynamicTimeIndex: number;
  setDynamicTimeIndex: (i: number) => void;
  dynamicAmpScale: number;
  setDynamicAmpScale: (s: number) => void;

  clearAll: () => void;
}

export const useResultsStore = create<ResultsState>((set) => ({
  staticResults: null,
  modalResults: null,
  dynamicResults: null,
  setStatic: (r) => set({ staticResults: r }),
  setModal: (r) => set({ modalResults: r }),
  setDynamic: (r) => set({ dynamicResults: r }),

  isosurfaceData: null,
  setIsosurfaceData: (d) => set({ isosurfaceData: d, showIsosurfaces: !!d }),
  showIsosurfaces: false,
  toggleIsosurfaces: () => set((s) => ({ showIsosurfaces: !s.showIsosurfaces })),

  modelHashAtAnalysis: null,
  setModelHashAtAnalysis: (h) => set({ modelHashAtAnalysis: h }),

  deformedScale: 100,
  setDeformedScale: (s) => set({ deformedScale: s }),

  showDeformed: true,
  toggleDeformed: () => set((s) => ({ showDeformed: !s.showDeformed })),

  showStressColormap: false,
  toggleStressColormap: () => set((s) => ({ showStressColormap: !s.showStressColormap })),

  selectedModeIndex: 0,
  setSelectedModeIndex: (i) => set({ selectedModeIndex: i }),

  modeAnimating: true,
  setModeAnimating: (b) => set({ modeAnimating: b }),

  modeAnimAmplitude: 0.5,
  setModeAnimAmplitude: (a) => set({ modeAnimAmplitude: a }),

  selectedHistoryNode: null,
  setSelectedHistoryNode: (n) => set({ selectedHistoryNode: n }),

  showDynamicAnimation: true,
  toggleDynamicAnimation: () => set((s) => ({ showDynamicAnimation: !s.showDynamicAnimation })),
  dynamicAnimating: true,
  setDynamicAnimating: (b) => set({ dynamicAnimating: b }),
  dynamicTimeIndex: 0,
  setDynamicTimeIndex: (i) => set({ dynamicTimeIndex: i }),
  dynamicAmpScale: 100,
  setDynamicAmpScale: (s) => set({ dynamicAmpScale: s }),

  clearAll: () => set({ staticResults: null, modalResults: null, dynamicResults: null,
                        dynamicTimeIndex: 0, isosurfaceData: null, showIsosurfaces: false }),
}));
