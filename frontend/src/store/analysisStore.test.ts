import { beforeEach, describe, expect, it } from "vitest";

import { useAnalysisStore } from "./analysisStore";

beforeEach(() => {
  useAnalysisStore.setState({
    viewportMode: "solid",
    projection: "perspective",
    useViewportEngine: false,
    activeViewPreset: "engineer",
    showGrid: true,
    showLoads: true,
    showConstraints: true,
    showNodeLabels: false,
  });
});

describe("analysisStore view presets", () => {
  it("applica il preset CAD come vista wireframe ortografica", () => {
    useAnalysisStore.getState().applyViewPreset("cad");
    const s = useAnalysisStore.getState();

    expect(s.activeViewPreset).toBe("cad");
    expect(s.viewportMode).toBe("wireframe");
    expect(s.projection).toBe("orthographic");
    expect(s.useViewportEngine).toBe(false);
    expect(s.showGrid).toBe(true);
    expect(s.showNodeLabels).toBe(true);
  });

  it("applica il preset performance accendendo il nuovo engine", () => {
    useAnalysisStore.getState().applyViewPreset("performance");
    const s = useAnalysisStore.getState();

    expect(s.activeViewPreset).toBe("performance");
    expect(s.viewportMode).toBe("solid");
    expect(s.projection).toBe("orthographic");
    expect(s.useViewportEngine).toBe(true);
    expect(s.showGrid).toBe(false);
    expect(s.showLoads).toBe(false);
    expect(s.showConstraints).toBe(false);
  });

  it("una modifica manuale rende la vista custom", () => {
    useAnalysisStore.getState().applyViewPreset("review");
    useAnalysisStore.getState().setViewportMode("solid");

    expect(useAnalysisStore.getState().activeViewPreset).toBe("custom");
  });
});
