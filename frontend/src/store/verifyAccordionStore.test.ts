/**
 * Test verifyAccordionStore (v3.4 Fetta E2.5c · 29/05 sera).
 *
 * Pattern derivato da `rightPanelStore.test.ts` (E2.2). Verifica gli
 * invarianti del nuovo store accordion del panel DX di Verifica:
 * default empty (tutte chiuse), toggle inverte, open/close idempotenti,
 * multi-open (piu' sezioni contemporaneamente).
 */
import { describe, it, expect, beforeEach } from "vitest";

import {
  useVerifyAccordionStore,
  useIsSectionOpen,
} from "./verifyAccordionStore";
import { renderHook } from "@testing-library/react";


beforeEach(() => {
  useVerifyAccordionStore.setState({ openSections: [] });
  try { window.localStorage.removeItem("feapro-verify-accordion"); } catch { /* ignore */ }
});


describe("verifyAccordionStore", () => {
  it("starts with no sections open (junior vede solo Sintesi)", () => {
    expect(useVerifyAccordionStore.getState().openSections).toEqual([]);
  });

  it("open() aggiunge la sezione (idempotente)", () => {
    useVerifyAccordionStore.getState().open("displacements");
    expect(useVerifyAccordionStore.getState().openSections).toEqual(["displacements"]);
    // idempotente: open() su sezione gia' aperta non duplica
    useVerifyAccordionStore.getState().open("displacements");
    expect(useVerifyAccordionStore.getState().openSections).toEqual(["displacements"]);
  });

  it("close() rimuove la sezione (idempotente)", () => {
    useVerifyAccordionStore.getState().open("forces");
    useVerifyAccordionStore.getState().close("forces");
    expect(useVerifyAccordionStore.getState().openSections).toEqual([]);
    // idempotente: close() su sezione gia' chiusa e' no-op
    useVerifyAccordionStore.getState().close("forces");
    expect(useVerifyAccordionStore.getState().openSections).toEqual([]);
  });

  it("toggle() inverte lo stato di una sezione", () => {
    const s = useVerifyAccordionStore.getState();
    s.toggle("ec3");
    expect(useVerifyAccordionStore.getState().openSections).toEqual(["ec3"]);
    s.toggle("ec3");
    expect(useVerifyAccordionStore.getState().openSections).toEqual([]);
  });

  it("supporta multi-open: piu' sezioni aperte contemporaneamente", () => {
    const s = useVerifyAccordionStore.getState();
    s.open("displacements");
    s.open("reactions");
    s.open("ec3");
    expect(useVerifyAccordionStore.getState().openSections).toEqual([
      "displacements",
      "reactions",
      "ec3",
    ]);
  });

  it("closeAll() reset a empty (Sintesi resta sempre visibile fuori store)", () => {
    const s = useVerifyAccordionStore.getState();
    s.open("displacements");
    s.open("forces");
    s.closeAll();
    expect(useVerifyAccordionStore.getState().openSections).toEqual([]);
  });

  it("toggle() su una sezione non rimuove le altre (multi-open preservato)", () => {
    const s = useVerifyAccordionStore.getState();
    s.open("displacements");
    s.open("ec3");
    s.toggle("displacements"); // chiude solo displacements
    expect(useVerifyAccordionStore.getState().openSections).toEqual(["ec3"]);
  });

  it("useIsSectionOpen hook ritorna boolean per la sezione richiesta", () => {
    useVerifyAccordionStore.getState().open("reactions");
    const { result: openReactions } = renderHook(() => useIsSectionOpen("reactions"));
    const { result: closedEc3 } = renderHook(() => useIsSectionOpen("ec3"));
    expect(openReactions.current).toBe(true);
    expect(closedEc3.current).toBe(false);
  });
});
