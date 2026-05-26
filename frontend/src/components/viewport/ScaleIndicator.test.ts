/**
 * ScaleIndicator + CameraTracker · unit test (v2.5.7 cluster A T4, BUG-043).
 *
 * Test della logica pura `pickScaleLabel` (mapping metri/screen → etichetta
 * scala) e `computeMetersPerScreenHeight` (camera prospettica/orthographic
 * → altezza visibile in metri). Render integration test del componente
 * ScaleIndicator è fuori scope (R3F + Canvas + bounds del modello richiedono
 * setup ampio, demandato a v2.5.10 paolo-readiness-gate).
 */
import { describe, it, expect } from "vitest";
import { pickScaleLabel } from "./ScaleIndicator";
import { computeMetersPerScreenHeight } from "./CameraTracker";

describe("pickScaleLabel · v2.5.7 BUG-043", () => {
  const cases: Array<[number, string]> = [
    [0.5, "1:5"],
    [1.5, "1:5"],
    [3, "1:10"],
    [7, "1:20"],
    [15, "1:50"],
    [30, "1:100"],
    [80, "1:200"],
    [150, "1:500"],
    [400, "1:1000"],
  ];

  it.each(cases)("pickScaleLabel(%f m) → '%s'", (meters, expected) => {
    expect(pickScaleLabel(meters)).toBe(expected);
  });

  it("valori non finiti fanno fallback su 1:50", () => {
    expect(pickScaleLabel(Number.NaN)).toBe("1:50");
    expect(pickScaleLabel(Number.POSITIVE_INFINITY)).toBe("1:50");
    expect(pickScaleLabel(0)).toBe("1:50");
    expect(pickScaleLabel(-1)).toBe("1:50");
  });
});

describe("computeMetersPerScreenHeight · v2.5.7 BUG-043", () => {
  it("camera prospettica fov=45 a distanza 100 → ~82.84m altezza visibile", () => {
    const camera = {
      isPerspectiveCamera: true,
      fov: 45,
      position: { length: () => 100 },
    };
    const h = computeMetersPerScreenHeight(camera as never);
    // 2 * 100 * tan(22.5°) ≈ 2 * 100 * 0.4142 ≈ 82.84
    expect(h).toBeGreaterThan(82);
    expect(h).toBeLessThan(83);
  });

  it("camera ortografica top=50 bottom=-50 zoom=1 → 100m altezza", () => {
    const camera = {
      isOrthographicCamera: true,
      zoom: 1,
      top: 50,
      bottom: -50,
    };
    const h = computeMetersPerScreenHeight(camera as never);
    expect(h).toBe(100);
  });

  it("camera ortografica zoom=2 dimezza l'altezza visibile", () => {
    const camera = {
      isOrthographicCamera: true,
      zoom: 2,
      top: 50,
      bottom: -50,
    };
    const h = computeMetersPerScreenHeight(camera as never);
    expect(h).toBe(50);
  });

  it("camera non riconosciuta → NaN (fallback gestito dal caller)", () => {
    const camera = { foo: "bar" };
    expect(computeMetersPerScreenHeight(camera as never)).toBeNaN();
  });
});
