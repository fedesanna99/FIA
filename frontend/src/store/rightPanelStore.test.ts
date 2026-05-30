/**
 * Test rightPanelStore (v3.4 Fetta E2-IA · Commit E2.2)
 *
 * Pattern derivato da `rightRailStore.test.ts`. Verifica gli invarianti
 * del nuovo store del panel destro della Shell custom: default "open",
 * close/open idempotenti, toggle che inverte lo stato.
 */
import { describe, it, expect, beforeEach } from "vitest";

import { useRightPanelStore } from "./rightPanelStore";


beforeEach(() => {
  useRightPanelStore.setState({ panelState: "open" });
  window.localStorage.clear();
});


describe("rightPanelStore", () => {
  it("starts with panelState 'open' (default non-rompi-comportamento)", () => {
    expect(useRightPanelStore.getState().panelState).toBe("open");
  });

  it("close() sets state to 'closed'", () => {
    useRightPanelStore.getState().close();
    expect(useRightPanelStore.getState().panelState).toBe("closed");
  });

  it("open() ripristina lo stato a 'open' dopo close()", () => {
    useRightPanelStore.getState().close();
    useRightPanelStore.getState().open();
    expect(useRightPanelStore.getState().panelState).toBe("open");
  });

  it("close() su panel gia' chiuso e' idempotente", () => {
    useRightPanelStore.getState().close();
    useRightPanelStore.getState().close();
    expect(useRightPanelStore.getState().panelState).toBe("closed");
  });

  it("open() su panel gia' aperto e' idempotente", () => {
    useRightPanelStore.getState().open();
    expect(useRightPanelStore.getState().panelState).toBe("open");
  });

  it("toggle() inverte lo stato open → closed → open", () => {
    const s = useRightPanelStore.getState();
    s.toggle();
    expect(useRightPanelStore.getState().panelState).toBe("closed");
    s.toggle();
    expect(useRightPanelStore.getState().panelState).toBe("open");
  });

  // ── v3.4 E2.3 (30/05/2026): inspector state ───────────────────────
  describe("openInspector (E2.3 selezione bidirezionale)", () => {
    it("openInspector() setta panelState a 'inspector'", () => {
      useRightPanelStore.getState().openInspector();
      expect(useRightPanelStore.getState().panelState).toBe("inspector");
    });

    it("openInspector() funziona anche partendo da 'closed'", () => {
      useRightPanelStore.getState().close();
      useRightPanelStore.getState().openInspector();
      expect(useRightPanelStore.getState().panelState).toBe("inspector");
    });

    it("open() da 'inspector' torna a 'open' (chiude inspector)", () => {
      useRightPanelStore.getState().openInspector();
      useRightPanelStore.getState().open();
      expect(useRightPanelStore.getState().panelState).toBe("open");
    });

    it("close() da 'inspector' chiude completamente", () => {
      useRightPanelStore.getState().openInspector();
      useRightPanelStore.getState().close();
      expect(useRightPanelStore.getState().panelState).toBe("closed");
    });

    it("toggle() da 'inspector' va a 'open' (non binario inverte solo open↔closed)", () => {
      // inspector → toggle → resta open (non e' binario, toggle inverte
      // solo open ↔ closed; inspector e' un terzo stato fuori toggle)
      useRightPanelStore.getState().openInspector();
      useRightPanelStore.getState().toggle();
      expect(useRightPanelStore.getState().panelState).toBe("open");
    });
  });
});
