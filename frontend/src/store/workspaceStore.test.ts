/**
 * workspaceStore tests (alpha.23) — copre il nuovo schema brief v1.2.1
 * + backward compat con il vecchio API.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { useWorkspaceStore } from "./workspaceStore";


beforeEach(() => {
  window.localStorage.clear();
  useWorkspaceStore.setState({
    workspace: "model",
    activeTab: {
      model: "tree", analysis: "linear", results: "viewport",
      verify: "ec3", io: "import", docs: "overview",
    } as any,
    helpOpen: false,
    paletteOpen: false,
    currentLeftPanel: "make",
    currentRightPanel: null,
    currentLeftTab: null,
    currentRightTab: null,
    isAiPanelOpen: false,
    isSettingsOpen: false,
    isEmptyState: false,
  });
});


describe("workspaceStore — new shell schema (brief v1.2.1)", () => {
  it("opens left panel exclusively", () => {
    const { openLeftPanel } = useWorkspaceStore.getState();
    openLeftPanel("make");
    expect(useWorkspaceStore.getState().currentLeftPanel).toBe("make");
    openLeftPanel("solve");
    expect(useWorkspaceStore.getState().currentLeftPanel).toBe("solve");
  });

  it("openLeftPanel with tab sets currentLeftTab", () => {
    const { openLeftPanel } = useWorkspaceStore.getState();
    openLeftPanel("make", "geometria");
    expect(useWorkspaceStore.getState().currentLeftTab).toBe("geometria");
  });

  it("closeLeftPanel resets to null", () => {
    const s = useWorkspaceStore.getState();
    s.openLeftPanel("solve");
    s.closeLeftPanel();
    expect(useWorkspaceStore.getState().currentLeftPanel).toBeNull();
    expect(useWorkspaceStore.getState().currentLeftTab).toBeNull();
  });

  it("right panel independent from left", () => {
    const s = useWorkspaceStore.getState();
    s.openLeftPanel("make");
    s.openRightPanel("inspect");
    const after = useWorkspaceStore.getState();
    expect(after.currentLeftPanel).toBe("make");
    expect(after.currentRightPanel).toBe("inspect");
  });

  it("enterEmptyState closes ALL panels + toggles + tabs", () => {
    const s = useWorkspaceStore.getState();
    s.openLeftPanel("make");
    s.openRightPanel("inspect");
    s.toggleAiPanel();
    s.toggleSettings();
    s.enterEmptyState();
    const after = useWorkspaceStore.getState();
    expect(after.currentLeftPanel).toBeNull();
    expect(after.currentRightPanel).toBeNull();
    expect(after.isAiPanelOpen).toBe(false);
    expect(after.isSettingsOpen).toBe(false);
    expect(after.isEmptyState).toBe(true);
  });

  it("opening a panel exits empty state", () => {
    const s = useWorkspaceStore.getState();
    s.enterEmptyState();
    expect(useWorkspaceStore.getState().isEmptyState).toBe(true);
    s.openLeftPanel("make");
    expect(useWorkspaceStore.getState().isEmptyState).toBe(false);
  });

  it("toggleAiPanel flips state", () => {
    const s = useWorkspaceStore.getState();
    expect(useWorkspaceStore.getState().isAiPanelOpen).toBe(false);
    s.toggleAiPanel();
    expect(useWorkspaceStore.getState().isAiPanelOpen).toBe(true);
    s.toggleAiPanel();
    expect(useWorkspaceStore.getState().isAiPanelOpen).toBe(false);
  });
});


describe("workspaceStore — legacy backward compat", () => {
  it("setWorkspace('model') bridges to currentLeftPanel='make'", () => {
    useWorkspaceStore.getState().setWorkspace("model");
    expect(useWorkspaceStore.getState().workspace).toBe("model");
    expect(useWorkspaceStore.getState().currentLeftPanel).toBe("make");
  });

  it("setWorkspace('analysis') bridges to currentLeftPanel='solve'", () => {
    useWorkspaceStore.getState().setWorkspace("analysis");
    expect(useWorkspaceStore.getState().workspace).toBe("analysis");
    expect(useWorkspaceStore.getState().currentLeftPanel).toBe("solve");
  });

  it("setWorkspace('verify') bridges to currentLeftPanel='verify'", () => {
    useWorkspaceStore.getState().setWorkspace("verify");
    expect(useWorkspaceStore.getState().currentLeftPanel).toBe("verify");
  });

  it("openLeftPanel('solve') bridges to workspace='analysis'", () => {
    useWorkspaceStore.getState().openLeftPanel("solve");
    expect(useWorkspaceStore.getState().workspace).toBe("analysis");
    expect(useWorkspaceStore.getState().currentLeftPanel).toBe("solve");
  });

  it("openLeftPanel('verify') bridges to workspace='verify'", () => {
    useWorkspaceStore.getState().openLeftPanel("verify");
    expect(useWorkspaceStore.getState().workspace).toBe("verify");
  });

  it("legacy setTab + activeTab still works", () => {
    const s = useWorkspaceStore.getState();
    s.setTab("analysis", "modal");
    expect(useWorkspaceStore.getState().activeTab.analysis).toBe("modal");
  });

  it("paletteOpen and helpOpen toggles unchanged", () => {
    const s = useWorkspaceStore.getState();
    s.togglePalette();
    expect(useWorkspaceStore.getState().paletteOpen).toBe(true);
    s.setHelp(true);
    expect(useWorkspaceStore.getState().helpOpen).toBe(true);
  });
});
