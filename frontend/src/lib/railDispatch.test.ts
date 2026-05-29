// v2.6.6 E.2 · useRailDispatch hook tests.
//
// Verifica che il dispatcher gestisca correttamente tutti i RailActionKind
// (workspace, workspace-with-preset, placeholder-toast, navigate-home,
// open-models-browser, open-report-dialog, open-template-gallery,
// open-docs-help) + click guard requiresModel senza modello attivo.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useRailDispatch, WORKSPACE_TO_LEGACY, PRESET_TO_ANALYSIS_TYPE } from "./railDispatch";
import { findRailItem } from "./railConfig";
import { useWorkspaceStore } from "../store/workspaceStore";
import { useAnalysisStore } from "../store/analysisStore";
import { useModelStore } from "../store/modelStore";
import { useToastStore } from "../store/toastStore";

beforeEach(() => {
  useWorkspaceStore.setState({ workspace: "model", helpOpen: false } as never);
  useAnalysisStore.setState({ analysisType: "static" } as never);
  useModelStore.setState({
    model: {
      id: "m1", name: "Test", units: "SI", is_3d: false,
      nodes: [], elements: [], loads: [], constraints: [],
    },
  } as never);
  useToastStore.setState({ toasts: [] });
});

describe("useRailDispatch · workspace switching", () => {
  it("dispatches 'workspace' action: setWorkspace called with legacy id", () => {
    // v3.4 Fetta E2.5a: usato "results" al posto del rimosso "checks".
    // `results` ha workspace=risultati → wsToLegacy → "verify".
    const { result } = renderHook(() => useRailDispatch());
    const item = findRailItem("results")!;
    act(() => result.current(item));
    expect(useWorkspaceStore.getState().workspace).toBe("verify");
  });

  it("dispatches 'workspace-with-preset' action: setWorkspace + setAnalysisType", () => {
    const { result } = renderHook(() => useRailDispatch());
    const item = findRailItem("dynamic")!;
    act(() => result.current(item));
    expect(useWorkspaceStore.getState().workspace).toBe("analysis");
    expect(useAnalysisStore.getState().analysisType).toBe("dynamic");
  });

  it("dispatches 'workspace-with-preset' seismic: analysisType = modal (sismica)", () => {
    const { result } = renderHook(() => useRailDispatch());
    const item = findRailItem("seismic")!;
    act(() => result.current(item));
    expect(useAnalysisStore.getState().analysisType).toBe("modal");
  });
});

describe("useRailDispatch · placeholder toast", () => {
  it("dispatches placeholder-toast: emits info toast with custom message", () => {
    const { result } = renderHook(() => useRailDispatch());
    const item = findRailItem("jobs")!;
    act(() => result.current(item));
    const toasts = useToastStore.getState().toasts;
    expect(toasts).toHaveLength(1);
    expect(toasts[0].level).toBe("info");
    expect(toasts[0].message).toMatch(/Jobs/i);
  });
});

describe("useRailDispatch · click guard requiresModel", () => {
  beforeEach(() => {
    useModelStore.setState({ model: null } as never);
  });

  it("requiresModel: senza modello, toast educational con CTA", () => {
    const { result } = renderHook(() => useRailDispatch());
    const item = findRailItem("linear")!;
    act(() => result.current(item));
    const toasts = useToastStore.getState().toasts;
    expect(toasts).toHaveLength(1);
    expect(toasts[0].level).toBe("info");
    expect(toasts[0].message).toMatch(/Lineare/);
    expect(toasts[0].action?.label).toMatch(/galleria template/i);
  });

  it("requiresModel: senza modello NON cambia workspace", () => {
    // v3.4 Fetta E2.5a: usato "results" al posto del rimosso "checks".
    useWorkspaceStore.setState({ workspace: "model" } as never);
    const { result } = renderHook(() => useRailDispatch());
    const item = findRailItem("results")!;
    act(() => result.current(item));
    expect(useWorkspaceStore.getState().workspace).toBe("model");
  });

  it("requiresModel CTA: click chiama feapro:open-template-gallery", () => {
    const events: string[] = [];
    const listener = (e: Event) => events.push(e.type);
    window.addEventListener("feapro:open-template-gallery", listener);

    const { result } = renderHook(() => useRailDispatch());
    const item = findRailItem("report")!;
    act(() => result.current(item));
    const action = useToastStore.getState().toasts[0].action;
    expect(action).toBeDefined();
    act(() => action!.onClick());

    window.removeEventListener("feapro:open-template-gallery", listener);
    expect(events).toContain("feapro:open-template-gallery");
  });
});

describe("useRailDispatch · event-based actions", () => {
  it("open-models-browser dispatches feapro:open-models-list", () => {
    const events: string[] = [];
    const listener = (e: Event) => events.push(e.type);
    window.addEventListener("feapro:open-models-list", listener);

    const { result } = renderHook(() => useRailDispatch());
    const item = findRailItem("models")!;
    act(() => result.current(item));

    window.removeEventListener("feapro:open-models-list", listener);
    expect(events).toContain("feapro:open-models-list");
  });

  it("open-report-dialog dispatches feapro:open-export-pdf", () => {
    const events: string[] = [];
    const listener = (e: Event) => events.push(e.type);
    window.addEventListener("feapro:open-export-pdf", listener);

    const { result } = renderHook(() => useRailDispatch());
    const item = findRailItem("report")!;
    act(() => result.current(item));

    window.removeEventListener("feapro:open-export-pdf", listener);
    expect(events).toContain("feapro:open-export-pdf");
  });

  it("open-template-gallery dispatches feapro:open-template-gallery", () => {
    const events: string[] = [];
    const listener = (e: Event) => events.push(e.type);
    window.addEventListener("feapro:open-template-gallery", listener);

    const { result } = renderHook(() => useRailDispatch());
    const item = findRailItem("templates")!;
    act(() => result.current(item));

    window.removeEventListener("feapro:open-template-gallery", listener);
    expect(events).toContain("feapro:open-template-gallery");
  });

  it("open-docs-help opens HelpSheet via workspaceStore.setHelp(true)", () => {
    const { result } = renderHook(() => useRailDispatch());
    const item = findRailItem("docs")!;
    act(() => result.current(item));
    expect(useWorkspaceStore.getState().helpOpen).toBe(true);
  });

  it("navigate-home sets workspace='model'", () => {
    useWorkspaceStore.setState({ workspace: "analysis" } as never);
    const { result } = renderHook(() => useRailDispatch());
    const item = findRailItem("home")!;
    act(() => result.current(item));
    expect(useWorkspaceStore.getState().workspace).toBe("model");
  });
});

describe("railDispatch maps (sanity)", () => {
  it("WORKSPACE_TO_LEGACY covers all 5 WorkspaceId", () => {
    expect(WORKSPACE_TO_LEGACY.modello).toBe("model");
    expect(WORKSPACE_TO_LEGACY.analisi).toBe("analysis");
    expect(WORKSPACE_TO_LEGACY.verifiche).toBe("verify");
    expect(WORKSPACE_TO_LEGACY.risultati).toBe("verify");
    expect(WORKSPACE_TO_LEGACY.io).toBe("verify");
  });

  it("PRESET_TO_ANALYSIS_TYPE maps seismic → modal", () => {
    expect(PRESET_TO_ANALYSIS_TYPE.static).toBe("static");
    expect(PRESET_TO_ANALYSIS_TYPE.dynamic).toBe("dynamic");
    expect(PRESET_TO_ANALYSIS_TYPE.seismic).toBe("modal");
  });
});
