/**
 * preconditions.test (v2.5.6 cluster F T2, DEC-A4).
 *
 * Suite del registry + `checkFeature` + `evaluatePrecondition`. Garantisce che:
 *   - Ogni `PreconditionId` riceve la valutazione corretta dallo stato.
 *   - `checkFeature` aggrega correttamente le precondizioni di una feature.
 *   - I `disabledAction` propositivi sono coerenti (no riferimenti a feature
 *     che non esistono).
 */
import { describe, it, expect } from "vitest";
import {
  evaluatePrecondition,
  checkFeature,
  FEATURE_PRECONDITIONS,
  type AppPreconditionState,
  type PreconditionId,
  type FeatureId,
} from "./preconditions";
import type { FEAModel } from "../types/model";

function makeEmptyState(): AppPreconditionState {
  return {
    model: null,
    staticResults: null,
    modalResults: null,
    selectedNodeIds: new Set(),
    selectedElementIds: new Set(),
    canUndo: false,
    canRedo: false,
  };
}

function makeModel(opts: { constraints?: number; loads?: number } = {}): FEAModel {
  const { constraints = 0, loads = 0 } = opts;
  return {
    id: "test-m",
    name: "Test",
    units: "SI",
    is_3d: false,
    nodes: [{ id: 1, x: 0, y: 0, z: 0 }],
    elements: [],
    constraints: Array.from({ length: constraints }, (_, i) => ({
      id: i + 1,
      type: "fixed" as const,
      node_id: 1,
    })),
    loads: Array.from({ length: loads }, (_, i) => ({
      id: i + 1,
      type: "nodal" as const,
      target_id: 1,
    })),
  };
}

describe("evaluatePrecondition · v2.5.6 T2 (DEC-A4)", () => {
  const empty = makeEmptyState();
  const full: AppPreconditionState = {
    model: makeModel({ constraints: 1, loads: 1 }),
    staticResults: { displacements: [], max_displacement: 0, max_stress: 0, reactions: [], solve_time_s: 0 } as never,
    modalResults: { modes: [] } as never,
    selectedNodeIds: new Set([1]),
    selectedElementIds: new Set([1]),
    canUndo: true,
    canRedo: true,
  };

  const truthCases: Array<[PreconditionId, boolean]> = [
    ["model-exists", true],
    ["model-has-constraints", true],
    ["model-has-loads", true],
    ["static-results-exist", true],
    ["modal-results-exist", true],
    ["node-selected", true],
    ["element-selected", true],
    ["history-can-undo", true],
    ["history-can-redo", true],
  ];

  it.each(truthCases)("'%s' è true su stato full", (id, expected) => {
    expect(evaluatePrecondition(id, full)).toBe(expected);
  });

  const falseCases: Array<[PreconditionId, boolean]> = [
    ["model-exists", false],
    ["model-has-constraints", false],
    ["model-has-loads", false],
    ["static-results-exist", false],
    ["modal-results-exist", false],
    ["node-selected", false],
    ["element-selected", false],
    ["history-can-undo", false],
    ["history-can-redo", false],
  ];

  it.each(falseCases)("'%s' è false su stato vuoto", (id, expected) => {
    expect(evaluatePrecondition(id, empty)).toBe(expected);
  });

  it("'model-has-constraints' è false se model esiste ma constraints=[]", () => {
    const state: AppPreconditionState = { ...empty, model: makeModel({ constraints: 0, loads: 5 }) };
    expect(evaluatePrecondition("model-has-constraints", state)).toBe(false);
    expect(evaluatePrecondition("model-has-loads", state)).toBe(true);
  });
});

describe("checkFeature · v2.5.6 T2", () => {
  const empty = makeEmptyState();

  it("'run-static' su modello vuoto: missing 3 precondizioni", () => {
    const result = checkFeature("run-static", empty);
    expect(result.available).toBe(false);
    expect(result.missing).toEqual([
      "model-exists",
      "model-has-constraints",
      "model-has-loads",
    ]);
    expect(result.disabledLabel).toMatch(/vincoli e carichi/);
  });

  it("'run-static' su modello con vincoli e carichi: available", () => {
    const state: AppPreconditionState = {
      ...empty,
      model: makeModel({ constraints: 1, loads: 1 }),
    };
    const result = checkFeature("run-static", state);
    expect(result.available).toBe(true);
    expect(result.missing).toEqual([]);
  });

  it("'verify-ec3' senza risultati statici: propone azione 'run-static'", () => {
    const result = checkFeature("verify-ec3", empty);
    expect(result.available).toBe(false);
    expect(result.disabledAction).toBe("run-static");
    expect(result.disabledActionLabel).toBe("Esegui analisi statica");
  });

  it("'undo' rispetta canUndo flag", () => {
    expect(checkFeature("undo", { ...empty, canUndo: false }).available).toBe(false);
    expect(checkFeature("undo", { ...empty, canUndo: true }).available).toBe(true);
  });

  it("'inspect-node' rispetta selectedNodeIds non vuoto", () => {
    expect(checkFeature("inspect-node", empty).available).toBe(false);
    expect(
      checkFeature("inspect-node", { ...empty, selectedNodeIds: new Set([1]) }).available,
    ).toBe(true);
  });
});

describe("FEATURE_PRECONDITIONS · integrità interna", () => {
  it("ogni disabledAction punta a un FeatureId esistente nel registry", () => {
    const featureIds = Object.keys(FEATURE_PRECONDITIONS) as FeatureId[];
    for (const fid of featureIds) {
      const cfg = FEATURE_PRECONDITIONS[fid];
      if (cfg.disabledAction !== null) {
        expect(featureIds).toContain(cfg.disabledAction);
      }
    }
  });

  it("ogni disabledActionLabel è definito iff disabledAction è definito", () => {
    const featureIds = Object.keys(FEATURE_PRECONDITIONS) as FeatureId[];
    for (const fid of featureIds) {
      const cfg = FEATURE_PRECONDITIONS[fid];
      expect(cfg.disabledAction === null).toBe(cfg.disabledActionLabel === null);
    }
  });
});
