/**
 * gpsTrust.test.ts (v1.9.1 T1) — unit test deterministici per
 * `inferTrustOrigin` e `toneFromUc`.
 */
import { describe, it, expect } from "vitest";
import { inferTrustOrigin, toneFromUc, GPS_FYD } from "./gpsTrust";


describe("inferTrustOrigin", () => {
  it("model id che inizia con 'ai_' → 'ai'", () => {
    expect(inferTrustOrigin("ai_generated_beam_42")).toBe("ai");
  });

  it("model id che inizia con 'ex_' → 'template'", () => {
    expect(inferTrustOrigin("ex_simple_beam_2d")).toBe("template");
    expect(inferTrustOrigin("ex_portal_frame_2d")).toBe("template");
  });

  it("model id che inizia con 'imp_' → 'imported'", () => {
    expect(inferTrustOrigin("imp_my_model")).toBe("imported");
  });

  it("model id che inizia con 'dxf_' → 'imported'", () => {
    expect(inferTrustOrigin("dxf_import_001")).toBe("imported");
  });

  it("model id che inizia con 'ifc_' → 'imported'", () => {
    expect(inferTrustOrigin("ifc_bim_export")).toBe("imported");
  });

  it("model id che NON matcha pattern noti → 'user'", () => {
    expect(inferTrustOrigin("my-portal-2026")).toBe("user");
    expect(inferTrustOrigin("12345-uuid")).toBe("user");
    expect(inferTrustOrigin("trave-test-fedes")).toBe("user");
  });

  it("prefix è case-sensitive (EX_*, AI_* NON matchano)", () => {
    expect(inferTrustOrigin("EX_beam")).toBe("user");
    expect(inferTrustOrigin("AI_gen")).toBe("user");
  });

  it("string vuota → 'user' (fallback)", () => {
    expect(inferTrustOrigin("")).toBe("user");
  });
});


describe("toneFromUc", () => {
  it("UC 0 → 'ok'", () => {
    expect(toneFromUc(0)).toBe("ok");
  });

  it("UC 0.69 (sotto soglia warn) → 'ok'", () => {
    expect(toneFromUc(0.69)).toBe("ok");
  });

  it("UC esattamente 0.7 → 'warn' (soglia inclusiva)", () => {
    expect(toneFromUc(0.7)).toBe("warn");
  });

  it("UC 0.99 (sotto soglia critical) → 'warn'", () => {
    expect(toneFromUc(0.99)).toBe("warn");
  });

  it("UC esattamente 1.0 → 'critical' (soglia inclusiva)", () => {
    expect(toneFromUc(1.0)).toBe("critical");
  });

  it("UC > 1 → 'critical'", () => {
    expect(toneFromUc(1.5)).toBe("critical");
    expect(toneFromUc(3.0)).toBe("critical");
  });

  it("UC negativo (edge case) → 'ok'", () => {
    expect(toneFromUc(-0.1)).toBe("ok");
  });
});


describe("GPS_FYD costanti", () => {
  it("contiene s275, ec3, ntc con valori MPa attesi", () => {
    expect(GPS_FYD.s275).toBe(275);
    expect(GPS_FYD.ec3).toBe(235);
    expect(GPS_FYD.ntc).toBe(261);
  });

  it("ntc < s275 (γM0 = 1.05 abbassa fyd)", () => {
    expect(GPS_FYD.ntc).toBeLessThan(GPS_FYD.s275);
  });
});
