import { describe, it, expect } from "vitest";
import { modelBoundsFromNodes } from "./cameraUtils";


describe("modelBoundsFromNodes · v1.6 S0 B15", () => {
  it("empty nodes → bounds unit con maxDim=1", () => {
    const b = modelBoundsFromNodes([]);
    expect(b.maxDim).toBe(1);
    expect(b.center.x).toBe(0);
    expect(b.center.y).toBe(0);
    expect(b.center.z).toBe(0);
  });

  it("single node → bounds 0×0×0 con maxDim clamp a 1", () => {
    const b = modelBoundsFromNodes([{ x: 5, y: 3, z: 1 }]);
    expect(b.center.x).toBe(5);
    expect(b.center.y).toBe(3);
    expect(b.center.z).toBe(1);
    expect(b.maxDim).toBe(1); // clamp evita div per 0
  });

  it("bbox 2 nodi: center = mid, maxDim = max axis", () => {
    const b = modelBoundsFromNodes([
      { x: 0, y: 0, z: 0 },
      { x: 6, y: 4, z: 2 },
    ]);
    expect(b.center.x).toBe(3);
    expect(b.center.y).toBe(2);
    expect(b.center.z).toBe(1);
    expect(b.maxDim).toBe(6); // x e' max
  });

  it("bounds 3D non-isotropico (torre verticale)", () => {
    const b = modelBoundsFromNodes([
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 0, z: 0 },
      { x: 0, y: 0, z: 12 }, // alta in z
    ]);
    expect(b.maxDim).toBe(12);
    expect(b.center.z).toBe(6);
  });
});
