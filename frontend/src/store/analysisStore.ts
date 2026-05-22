import { create } from "zustand";
import type { AnalysisType } from "../types/results";

export type ViewportMode = "wireframe" | "solid" | "transparent";
export type ViewPreset = "custom" | "engineer" | "cad" | "review" | "performance";

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
  useViewportEngine: boolean;
  toggleViewportEngine: () => void;
  activeViewPreset: ViewPreset;
  applyViewPreset: (p: Exclude<ViewPreset, "custom">) => void;
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
  setViewportMode: (m) => set({ viewportMode: m, activeViewPreset: "custom" }),
  useViewportEngine: false,
  toggleViewportEngine: () => set((s) => ({
    useViewportEngine: !s.useViewportEngine,
    activeViewPreset: "custom",
  })),
  activeViewPreset: "engineer",
  applyViewPreset: (p) => set(() => {
    switch (p) {
      case "cad":
        return {
          activeViewPreset: p,
          viewportMode: "wireframe",
          projection: "orthographic",
          useViewportEngine: false,
          showGrid: true,
          showLoads: false,
          showConstraints: false,
          showNodeLabels: true,
        };
      case "review":
        return {
          activeViewPreset: p,
          viewportMode: "transparent",
          projection: "perspective",
          useViewportEngine: false,
          showGrid: false,
          showLoads: true,
          showConstraints: true,
          showNodeLabels: false,
        };
      case "performance":
        return {
          activeViewPreset: p,
          viewportMode: "solid",
          projection: "orthographic",
          useViewportEngine: true,
          showGrid: false,
          showLoads: false,
          showConstraints: false,
          showNodeLabels: false,
        };
      case "engineer":
      default:
        return {
          activeViewPreset: p,
          viewportMode: "solid",
          projection: "perspective",
          useViewportEngine: false,
          showGrid: true,
          showLoads: true,
          showConstraints: true,
          showNodeLabels: false,
        };
    }
  }),
  projection: "perspective",
  setProjection: (p) => set({ projection: p, activeViewPreset: "custom" }),
  showGrid: true,
  toggleGrid: () => set((s) => ({ showGrid: !s.showGrid, activeViewPreset: "custom" })),
  showLoads: true,
  toggleLoads: () => set((s) => ({ showLoads: !s.showLoads, activeViewPreset: "custom" })),
  showConstraints: true,
  toggleConstraints: () => set((s) => ({ showConstraints: !s.showConstraints, activeViewPreset: "custom" })),
  showNodeLabels: false,
  toggleNodeLabels: () => set((s) => ({ showNodeLabels: !s.showNodeLabels, activeViewPreset: "custom" })),
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
