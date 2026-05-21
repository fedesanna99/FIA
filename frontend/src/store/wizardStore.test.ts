import { describe, it, expect, beforeEach } from "vitest";
import { useWizardStore } from "./wizardStore";


beforeEach(() => {
  useWizardStore.getState().close();
});


describe("wizardStore", () => {
  it("starts with active=null and empty payload", () => {
    const s = useWizardStore.getState();
    expect(s.active).toBeNull();
    expect(s.payload).toEqual({});
  });

  it("open() sets active + payload", () => {
    useWizardStore.getState().open("import", { source: "dxf" });
    const s = useWizardStore.getState();
    expect(s.active).toBe("import");
    expect(s.payload).toEqual({ source: "dxf" });
  });

  it("open() without payload defaults to empty object", () => {
    useWizardStore.getState().open("sismica-th");
    expect(useWizardStore.getState().payload).toEqual({});
  });

  it("close() resets both fields", () => {
    useWizardStore.getState().open("mesh", { foo: 1 });
    useWizardStore.getState().close();
    const s = useWizardStore.getState();
    expect(s.active).toBeNull();
    expect(s.payload).toEqual({});
  });

  it("subscribes notify only on active change", () => {
    let calls = 0;
    const unsub = useWizardStore.subscribe((state, prev) => {
      if (state.active !== prev.active) calls += 1;
    });
    useWizardStore.getState().open("import");
    useWizardStore.getState().open("import"); // same kind, payload only differs → still triggers active path? no
    useWizardStore.getState().close();
    unsub();
    // open(import), close → 2 active transitions: null→import, import→null.
    // The middle open(import) keeps active=import → no transition.
    expect(calls).toBe(2);
  });

  it("accepts all 7 WizardKind variants without runtime error", () => {
    const kinds = ["new-model", "mesh", "import", "sismica-th", "pushover", "nonlinear", "report"] as const;
    for (const k of kinds) {
      useWizardStore.getState().open(k);
      expect(useWizardStore.getState().active).toBe(k);
    }
    useWizardStore.getState().close();
  });
});
