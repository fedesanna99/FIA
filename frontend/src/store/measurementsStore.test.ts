/**
 * Test misure 3D + store.
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  useMeasurementsStore,
  distance3D, angleDeg, chainLength,
  evaluateMeasurement,
} from "./measurementsStore";
import type { Node } from "../types/model";

const N = (id: number, x: number, y: number, z = 0): Node => ({ id, x, y, z });

describe("geometric helpers", () => {
  it("distance3D — axis aligned", () => {
    expect(distance3D(N(1, 0, 0), N(2, 3, 4))).toBeCloseTo(5);
  });

  it("distance3D — 3D pythagoras (1,2,2) → 3", () => {
    expect(distance3D(N(1, 0, 0, 0), N(2, 1, 2, 2))).toBeCloseTo(3);
  });

  it("angleDeg — 90° right angle at vertex", () => {
    const v = N(1, 0, 0);
    const a = N(2, 1, 0);
    const b = N(3, 0, 1);
    expect(angleDeg(v, a, b)).toBeCloseTo(90);
  });

  it("angleDeg — 0° collinear", () => {
    const v = N(1, 0, 0);
    const a = N(2, 1, 0);
    const b = N(3, 5, 0);
    expect(angleDeg(v, a, b)).toBeCloseTo(0);
  });

  it("angleDeg — 180° opposite", () => {
    const v = N(1, 0, 0);
    const a = N(2, 1, 0);
    const b = N(3, -1, 0);
    expect(angleDeg(v, a, b)).toBeCloseTo(180);
  });

  it("chainLength — sum of segments", () => {
    const path = [N(1, 0, 0), N(2, 3, 0), N(3, 3, 4)];
    expect(chainLength(path)).toBeCloseTo(7);
  });
});

describe("useMeasurementsStore", () => {
  beforeEach(() => {
    useMeasurementsStore.getState().clear();
  });

  it("add distance with 2 nodes", () => {
    const m = useMeasurementsStore.getState().add("distance", [1, 2]);
    expect(m.kind).toBe("distance");
    expect(m.nodeIds).toEqual([1, 2]);
  });

  it("add angle requires exactly 3 nodes", () => {
    expect(() =>
      useMeasurementsStore.getState().add("angle", [1, 2]),
    ).toThrow();
    expect(() =>
      useMeasurementsStore.getState().add("angle", [1, 2, 3, 4]),
    ).toThrow();
    expect(useMeasurementsStore.getState().add("angle", [1, 2, 3])).toBeDefined();
  });

  it("add chain requires at least 2 nodes", () => {
    expect(() => useMeasurementsStore.getState().add("chain", [1])).toThrow();
    expect(useMeasurementsStore.getState().add("chain", [1, 2, 3])).toBeDefined();
  });

  it("remove deletes measurement", () => {
    const m = useMeasurementsStore.getState().add("distance", [1, 2]);
    useMeasurementsStore.getState().remove(m.id);
    expect(useMeasurementsStore.getState().measurements).toHaveLength(0);
  });

  it("evaluateMeasurement returns NaN for missing nodes", () => {
    const m = useMeasurementsStore.getState().add("distance", [1, 99]);
    const map = new Map<number, Node>();
    map.set(1, N(1, 0, 0));
    expect(Number.isNaN(evaluateMeasurement(m, map))).toBe(true);
  });

  it("evaluateMeasurement distance correct", () => {
    const m = useMeasurementsStore.getState().add("distance", [10, 20]);
    const map = new Map<number, Node>();
    map.set(10, N(10, 0, 0));
    map.set(20, N(20, 3, 4));
    expect(evaluateMeasurement(m, map)).toBeCloseTo(5);
  });

  it("evaluateMeasurement angle correct", () => {
    const m = useMeasurementsStore.getState().add("angle", [1, 2, 3]);
    const map = new Map<number, Node>();
    map.set(1, N(1, 0, 0)); // vertex
    map.set(2, N(2, 1, 0));
    map.set(3, N(3, 0, 1));
    expect(evaluateMeasurement(m, map)).toBeCloseTo(90);
  });

  it("evaluateMeasurement chain correct", () => {
    const m = useMeasurementsStore.getState().add("chain", [1, 2, 3]);
    const map = new Map<number, Node>();
    map.set(1, N(1, 0, 0));
    map.set(2, N(2, 3, 0));
    map.set(3, N(3, 3, 4));
    expect(evaluateMeasurement(m, map)).toBeCloseTo(7);
  });
});
