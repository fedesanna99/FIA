/**
 * Test leftTreeStore (v3.4 Fetta E2-IA · Commit E2.4)
 *
 * Pattern derivato da `rightPanelStore.test.ts` (E2.2). Verifica gli
 * invarianti dello store del panel SX "Albero modello": default
 * "closed" (non rompi grid esistente), open/close idempotenti,
 * toggle che inverte lo stato.
 */
import { describe, it, expect, beforeEach } from "vitest";

import { useLeftTreeStore } from "./leftTreeStore";


beforeEach(() => {
  useLeftTreeStore.setState({ treeState: "closed" });
  window.localStorage.clear();
});


describe("leftTreeStore", () => {
  it("starts with treeState 'closed' (non rompi grid 3-col esistente)", () => {
    expect(useLeftTreeStore.getState().treeState).toBe("closed");
  });

  it("open() sets state to 'open'", () => {
    useLeftTreeStore.getState().open();
    expect(useLeftTreeStore.getState().treeState).toBe("open");
  });

  it("close() ripristina lo stato a 'closed' dopo open()", () => {
    useLeftTreeStore.getState().open();
    useLeftTreeStore.getState().close();
    expect(useLeftTreeStore.getState().treeState).toBe("closed");
  });

  it("open() su tree gia' aperto e' idempotente", () => {
    useLeftTreeStore.getState().open();
    useLeftTreeStore.getState().open();
    expect(useLeftTreeStore.getState().treeState).toBe("open");
  });

  it("close() su tree gia' chiuso e' idempotente", () => {
    useLeftTreeStore.getState().close();
    expect(useLeftTreeStore.getState().treeState).toBe("closed");
  });

  it("toggle() inverte lo stato closed → open → closed", () => {
    const s = useLeftTreeStore.getState();
    s.toggle();
    expect(useLeftTreeStore.getState().treeState).toBe("open");
    s.toggle();
    expect(useLeftTreeStore.getState().treeState).toBe("closed");
  });
});
