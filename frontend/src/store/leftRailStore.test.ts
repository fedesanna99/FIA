import { describe, it, expect, beforeEach } from "vitest";

import { useLeftRailStore } from "./leftRailStore";


beforeEach(() => {
  // alpha.22 default e' "model" — reset esplicito per ogni test.
  useLeftRailStore.setState({ openSection: null });
  window.localStorage.clear();
});


describe("leftRailStore (alpha.22)", () => {
  it("can be reset to null openSection", () => {
    expect(useLeftRailStore.getState().openSection).toBeNull();
  });

  it("toggle opens section when null", () => {
    useLeftRailStore.getState().toggle("analysis");
    expect(useLeftRailStore.getState().openSection).toBe("analysis");
  });

  it("toggle closes section when same is open", () => {
    useLeftRailStore.getState().open("model");
    useLeftRailStore.getState().toggle("model");
    expect(useLeftRailStore.getState().openSection).toBeNull();
  });

  it("toggle replaces section when different is open", () => {
    useLeftRailStore.getState().open("model");
    useLeftRailStore.getState().toggle("verify");
    expect(useLeftRailStore.getState().openSection).toBe("verify");
  });

  it("open() forces section explicitly", () => {
    useLeftRailStore.getState().open("results");
    expect(useLeftRailStore.getState().openSection).toBe("results");
  });

  it("close() resets to null", () => {
    useLeftRailStore.getState().open("io");
    useLeftRailStore.getState().close();
    expect(useLeftRailStore.getState().openSection).toBeNull();
  });
});
