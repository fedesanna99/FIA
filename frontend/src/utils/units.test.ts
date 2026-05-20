import { describe, it, expect } from "vitest";
import { fmt, fmtForce, fmtStress, fmtLength, fmtMass } from "./units";

describe("units formatting", () => {
  it("fmt returns dash for non-finite", () => {
    expect(fmt(NaN)).toBe("—");
    expect(fmt(Infinity)).toBe("—");
  });

  it("fmt scientific for very small/large", () => {
    expect(fmt(1e-5)).toMatch(/e/);
    expect(fmt(1e7)).toMatch(/e/);
  });

  it("fmtForce switches units correctly", () => {
    expect(fmtForce(500)).toMatch(/N$/);
    expect(fmtForce(5000)).toMatch(/kN$/);
    expect(fmtForce(5e6)).toMatch(/MN$/);
  });

  it("fmtStress switches units correctly", () => {
    expect(fmtStress(500)).toMatch(/Pa$/);
    expect(fmtStress(1e5)).toMatch(/kPa$/);
    expect(fmtStress(50e6)).toMatch(/MPa$/);
    expect(fmtStress(50e9)).toMatch(/GPa$/);
  });

  it("fmtLength switches units correctly", () => {
    expect(fmtLength(5)).toMatch(/m$/);
    expect(fmtLength(0.01)).toMatch(/mm$/);
    expect(fmtLength(5e-7)).toMatch(/µm$/);
  });

  it("fmtMass switches units correctly", () => {
    expect(fmtMass(500)).toMatch(/kg$/);
    expect(fmtMass(5000)).toMatch(/t$/);
  });
});
