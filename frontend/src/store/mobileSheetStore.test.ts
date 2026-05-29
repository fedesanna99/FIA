// v3.4 Fetta M4 mobile (30/05/2026) — mobileSheetStore tests.
//
// Verifica:
//   - default state "peek"
//   - expand() → "expanded"
//   - collapse() → "peek"
//   - toggle() inverte peek ↔ expanded
//   - reset fra test (state non leaks)

import { describe, it, expect, beforeEach } from "vitest";
import { useMobileSheetStore } from "./mobileSheetStore";

describe("mobileSheetStore", () => {
  beforeEach(() => {
    useMobileSheetStore.setState({ sheetState: "peek" });
    try { window.localStorage.removeItem("feapro-mobile-sheet"); } catch { /* ignore */ }
  });

  it("default state is peek", () => {
    expect(useMobileSheetStore.getState().sheetState).toBe("peek");
  });

  it("expand() sets state to expanded", () => {
    useMobileSheetStore.getState().expand();
    expect(useMobileSheetStore.getState().sheetState).toBe("expanded");
  });

  it("collapse() sets state to peek", () => {
    useMobileSheetStore.getState().expand();
    useMobileSheetStore.getState().collapse();
    expect(useMobileSheetStore.getState().sheetState).toBe("peek");
  });

  it("toggle() inverts state peek <-> expanded", () => {
    expect(useMobileSheetStore.getState().sheetState).toBe("peek");
    useMobileSheetStore.getState().toggle();
    expect(useMobileSheetStore.getState().sheetState).toBe("expanded");
    useMobileSheetStore.getState().toggle();
    expect(useMobileSheetStore.getState().sheetState).toBe("peek");
  });

  it("expand() is idempotent", () => {
    useMobileSheetStore.getState().expand();
    useMobileSheetStore.getState().expand();
    expect(useMobileSheetStore.getState().sheetState).toBe("expanded");
  });

  it("collapse() is idempotent", () => {
    useMobileSheetStore.getState().collapse();
    useMobileSheetStore.getState().collapse();
    expect(useMobileSheetStore.getState().sheetState).toBe("peek");
  });
});
