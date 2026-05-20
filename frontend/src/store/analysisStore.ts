import { create } from "zustand";
import type { AnalysisType } from "../types/results";

export type ViewportMode = "wireframe" | "solid" | "transparent";

interface AnalysisState {
  analysisType: AnalysisType;
  setAnalysisType: (t: AnalysisType) => void;

  staticParams: { include_self_weight: boolean; g: number };
  setStaticParams: (p: Partial<{ include_self_weight: boolean; g: number }>) => void;

  modalParams: { n_modes: number };
  setModalParams: (p: Partial<{ n_modes: number }>) => void;

  dynamicParams: {
    dt: number; t_end: number; beta: number; gamma: number;
    rayleigh_alpha: number; rayleigh_beta: number; save_every: number;
  };
  setDynamicParams: (p: Partial<AnalysisState["dynamicParams"]>) => void;

  isRunning: boolean;
  setRunning: (b: boolean) => void;
  progress: number;
  progressMessage: string;
  setProgress: (p: number, msg?: string) => void;

  viewportMode: ViewportMode;
  setViewportMode: (m: ViewportMode) => void;
  projection: "perspective" | "orthographic";
  setProjection: (p: "perspective" | "orthographic") => void;
  showGrid: boolean;
  toggleGrid: () => void;
  showLoads: boolean;
  toggleLoads: () => void;
  showConstraints: boolean;
  toggleConstraints: () => void;
  showNodeLabels: boolean;
  toggleNodeLabels: () => void;
  showDiagrams: boolean;
  toggleDiagrams: () => void;
  diagramComponent: "N" | "V" | "M";
  setDiagramComponent: (c: "N" | "V" | "M") => void;
  showPrincipals: boolean;
  togglePrincipals: () => void;

  /** Tool corrente nel viewport: "select" (default) o "create_node". */
  viewportTool: "select" | "create_node";
  setViewportTool: (t: "select" | "create_node") => void;

  /** Snap-to-grid attivo + risoluzione in metri. */
  snapEnabled: boolean;
  toggleSnap: () => void;
  snapResolution: number;
  setSnapResolution: (r: number) => void;
}

export const useAnalysisStore = create<AnalysisState>((set) => ({
  analysisType: "static",
  setAnalysisType: (t) => set({ analysisType: t }),

  staticParams: { include_self_weight: false, g: 9.81 },
  setStaticParams: (p) => set((s) => ({ staticParams: { ...s.staticParams, ...p } })),

  modalParams: { n_modes: 6 },
  setModalParams: (p) => set((s) => ({ modalParams: { ...s.modalParams, ...p } })),

  dynamicParams: {
    dt: 0.01, t_end: 2.0, beta: 0.25, gamma: 0.5,
    rayleigh_alpha: 0.1, rayleigh_beta: 0.001, save_every: 1,
  },
  setDynamicParams: (p) => set((s) => ({ dynamicParams: { ...s.dynamicParams, ...p } })),

  isRunning: false,
  setRunning: (b) => set({ isRunning: b }),
  progress: 0,
  progressMessage: "",
  setProgress: (p, msg = "") => set({ progress: p, progressMessage: msg }),

  viewportMode: "solid",
  setViewportMode: (m) => set({ viewportMode: m }),
  projection: "perspective",
  setProjection: (p) => set({ projection: p }),
  showGrid: true,
  toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),
  showLoads: true,
  toggleLoads: () => set((s) => ({ showLoads: !s.showLoads })),
  showConstraints: true,
  toggleConstraints: () => set((s) => ({ showConstraints: !s.showConstraints })),
  showNodeLabels: false,
  toggleNodeLabels: () => set((s) => ({ showNodeLabels: !s.showNodeLabels })),
  showDiagrams: false,
  toggleDiagrams: () => set((s) => ({ showDiagrams: !s.showDiagrams })),
  diagramComponent: "M",
  setDiagramComponent: (c) => set({ diagramComponent: c }),
  showPrincipals: false,
  togglePrincipals: () => set((s) => ({ showPrincipals: !s.showPrincipals })),
  viewportTool: "select",
  setViewportTool: (t) => set({ viewportTool: t }),
  snapEnabled: true,
  toggleSnap: () => set((s) => ({ snapEnabled: !s.snapEnabled })),
  snapResolution: 0.5,
  setSnapResolution: (r) => set({ snapResolution: r }),
}));
