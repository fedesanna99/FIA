import { describe, it, expect } from "vitest";
import {
  PALETTE_ITEMS, PALETTE_COUNT, SECTION_LABELS, SECTION_ORDER,
} from "./paletteItems";


describe("paletteItems registry", () => {
  it("has 40+ items minimum (Sprint 4 G6)", () => {
    // alpha.21 starting point: ~40+ voci. Espandiamo verso 180+ negli sprint
    // futuri (sezioni Materiali, Sezioni, Modelli recenti, Help articoli).
    expect(PALETTE_ITEMS.length).toBeGreaterThanOrEqual(40);
  });

  it("PALETTE_COUNT total matches array length", () => {
    expect(PALETTE_COUNT.total).toBe(PALETTE_ITEMS.length);
  });

  it("all items have unique id", () => {
    const ids = PALETTE_ITEMS.map((i) => i.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it("every item has label + section + actionKind", () => {
    for (const item of PALETTE_ITEMS) {
      expect(item.id).toBeTruthy();
      expect(item.label).toBeTruthy();
      expect(item.section).toBeTruthy();
      expect(item.actionKind).toBeTruthy();
    }
  });

  it("every item.section is in SECTION_ORDER", () => {
    for (const item of PALETTE_ITEMS) {
      expect(SECTION_ORDER).toContain(item.section);
    }
  });

  it("SECTION_LABELS covers all SECTION_ORDER", () => {
    for (const section of SECTION_ORDER) {
      expect(SECTION_LABELS[section]).toBeTruthy();
    }
  });

  it("has at least 1 item per main section (panels/commands/settings/help/loads)", () => {
    const sections = new Set(PALETTE_ITEMS.map((i) => i.section));
    expect(sections.has("panels")).toBe(true);
    expect(sections.has("commands")).toBe(true);
    expect(sections.has("settings")).toBe(true);
    expect(sections.has("help")).toBe(true);
    expect(sections.has("loads")).toBe(true);
  });

  it("workspace navigation items cover Make/Solve/Verify (v1.5.2)", () => {
    // v1.5.2 Task 35: "results" e "io" rimossi col legacy. Le 3 fasi
    // workflow restano i soli destination del LeftRail.
    const wsItems = PALETTE_ITEMS.filter((i) => i.actionKind === "workspace");
    const payloads = wsItems.map((i) => i.payload);
    expect(payloads).toContain("model");
    expect(payloads).toContain("analysis");
    expect(payloads).toContain("verify");
    expect(payloads).not.toContain("results");
    expect(payloads).not.toContain("io");
  });

  it("right-panel items cover Inspect/View/Tools/History", () => {
    const rpItems = PALETTE_ITEMS.filter((i) => i.actionKind === "right-panel");
    const payloads = rpItems.map((i) => i.payload);
    expect(payloads).toEqual(expect.arrayContaining(["inspect", "view", "tools", "history"]));
  });

  it("theme items cover dark/light/system", () => {
    const tItems = PALETTE_ITEMS.filter((i) => i.actionKind === "theme");
    const payloads = tItems.map((i) => i.payload);
    expect(payloads).toEqual(expect.arrayContaining(["dark", "light", "system"]));
  });

  it("run-analysis items cover static/modal/dynamic", () => {
    const rItems = PALETTE_ITEMS.filter((i) => i.actionKind === "run-analysis");
    const payloads = rItems.map((i) => i.payload);
    expect(payloads).toEqual(expect.arrayContaining(["static", "modal", "dynamic"]));
  });

  it("view preset items cover engineer/cad/review/performance", () => {
    const items = PALETTE_ITEMS.filter((i) => i.actionKind === "view-preset");
    const payloads = items.map((i) => i.payload);
    expect(payloads).toEqual(expect.arrayContaining(["engineer", "cad", "review", "performance"]));
  });

  it("items with `needsModel` true exist (commands richiedono modello)", () => {
    const withModel = PALETTE_ITEMS.filter((i) => i.needsModel);
    expect(withModel.length).toBeGreaterThan(0);
  });

  it("PALETTE_COUNT struct matches grouped counts", () => {
    const counts = PALETTE_ITEMS.reduce<Record<string, number>>(
      (acc, it) => ({ ...acc, [it.section]: (acc[it.section] ?? 0) + 1 }),
      {},
    );
    expect(counts.panels).toBe(PALETTE_COUNT.panels);
    expect(counts.commands).toBe(PALETTE_COUNT.commands);
    expect(counts.settings).toBe(PALETTE_COUNT.settings);
    expect(counts.help).toBe(PALETTE_COUNT.help);
    expect(counts.loads).toBe(PALETTE_COUNT.loads);
  });
});
