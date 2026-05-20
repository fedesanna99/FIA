import { describe, it, expect } from "vitest";
import { jet, jetHex, mapToJet } from "./colormap";

describe("colormap Jet", () => {
  it("clamps inputs outside [0,1]", () => {
    const below = jet(-1);
    const above = jet(2);
    expect(below.r).toBe(0);
    expect(above.r).toBeLessThanOrEqual(1);
  });

  it("returns blueish color near 0 and reddish near 1", () => {
    const cold = jet(0);
    const hot = jet(1);
    expect(cold.b).toBeGreaterThan(cold.r);
    expect(hot.r).toBeGreaterThan(hot.b);
  });

  it("jetHex returns a 7-char hex string", () => {
    const s = jetHex(0.5);
    expect(s).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("mapToJet handles min == max gracefully", () => {
    const c = mapToJet(5, 5, 5);
    expect(c.r).toBeGreaterThanOrEqual(0);
    expect(c.r).toBeLessThanOrEqual(1);
  });
});
