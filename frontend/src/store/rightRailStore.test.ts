import { describe, it, expect, beforeEach } from "vitest";

import { useRightRailStore } from "./rightRailStore";


beforeEach(() => {
  useRightRailStore.setState({ openSection: null });
  window.localStorage.clear();
});


describe("rightRailStore", () => {
  it("starts with openSection null", () => {
    expect(useRightRailStore.getState().openSection).toBeNull();
  });

  it("toggle opens a section if null", () => {
    useRightRailStore.getState().toggle("inspect");
    expect(useRightRailStore.getState().openSection).toBe("inspect");
  });

  it("toggle same section twice closes it", () => {
    const s = useRightRailStore.getState();
    s.toggle("view");
    expect(useRightRailStore.getState().openSection).toBe("view");
    s.toggle("view");
    expect(useRightRailStore.getState().openSection).toBeNull();
  });

  it("toggle different section replaces (not closes)", () => {
    const s = useRightRailStore.getState();
    s.toggle("inspect");
    s.toggle("tools");
    expect(useRightRailStore.getState().openSection).toBe("tools");
  });

  it("open(x) forces section regardless of current", () => {
    const s = useRightRailStore.getState();
    s.open("history");
    expect(useRightRailStore.getState().openSection).toBe("history");
    s.open("view");
    expect(useRightRailStore.getState().openSection).toBe("view");
  });

  it("close() resets to null", () => {
    const s = useRightRailStore.getState();
    s.open("inspect");
    s.close();
    expect(useRightRailStore.getState().openSection).toBeNull();
  });
});
