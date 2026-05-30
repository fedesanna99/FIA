/**
 * Test di consistenza catalog ↔ backend (SYNC, 30/05/2026 sera).
 *
 * Garantisce che TEMPLATES_CATALOG (UI) sia 1:1 con
 * `backend/examples.py::build_example_models()`. Se diverge, fallisce
 * con messaggio esplicito così l'errore non scappa in produzione
 * (no fantasmi futuri come avevamo pre-GAL fetta).
 *
 * Pattern: lista hardcoded dei 10 backend IDs noti (questo file) +
 * assert match con TEMPLATE_BACKEND_IDS esportato dal catalog. Per
 * aggiungere un template: aggiungere 1 voce in catalog + 1 voce qui.
 */
import { describe, it, expect } from "vitest";
import {
  TEMPLATES_CATALOG,
  TEMPLATE_BACKEND_IDS,
  VARIANT_THUMBS,
  findTemplateByBackendId,
  type TemplateEntry,
} from "./catalog";

/**
 * Source of truth: ID dei template attualmente esposti da
 * `backend/examples.py::build_example_models()`. Manutenere in sync
 * manualmente; il test fallisce esplicito se aggiungi al backend
 * senza aggiornare il catalog (o viceversa).
 */
const BACKEND_TEMPLATE_IDS_GROUND_TRUTH: readonly string[] = [
  "ex_simple_beam_2d",
  "ex_portal_frame_2d",
  "ex_truss_3d",
  "ex_shell_plate",
  "ex_tower_3d",
  "ex_tri3_seismic",
  "ex_cube_solid_h8",
  "ex_cable_bridge_2d",
  "ex_laminate_plate",
  "ex_rc_building_4st",         // TPL-1 (30/05/2026 sera)
  "ex_steel_portal_hall",       // TPL-2 (30/05/2026 sera)
  "ex_steel_truss_pratt_24m",   // TPL-3 (30/05/2026 sera)
  "ex_rc_frame_2d_pushover",    // TPL-4 (30/05/2026 sera)
  "ex_rc_floor_with_beams",     // TPL-5 (30/05/2026 sera)
  "ex_retaining_wall_2d",       // TPL-6 (30/05/2026 sera)
  "ex_bridge_simple_span_20m",  // TPL-7 (30/05/2026 sera)
  "ex_raft_winkler",            // TPL-8 (30/05/2026 sera, finale serie)
];


describe("Template catalog consistency", () => {
  it("ha esattamente 17 voci", () => {
    expect(TEMPLATES_CATALOG).toHaveLength(17);
  });

  it("ogni TemplateEntry ha tutti i campi richiesti non vuoti", () => {
    for (const t of TEMPLATES_CATALOG) {
      expect(t.id, `template ${t.uc}: id`).toBeTruthy();
      expect(t.backendId, `template ${t.uc}: backendId`).toMatch(/^ex_/);
      expect(t.uc, `template ${t.uc}: uc`).toMatch(/^UC\d+/);
      expect(t.title.length, `template ${t.uc}: title`).toBeGreaterThan(0);
      expect(t.desc.length, `template ${t.uc}: desc`).toBeGreaterThan(0);
      expect(t.pills.length, `template ${t.uc}: pills`).toBeGreaterThan(0);
      expect(t.timeMin, `template ${t.uc}: timeMin`).toBeGreaterThan(0);
      expect(t.variant, `template ${t.uc}: variant`).toBeTruthy();
    }
  });

  it("backend IDs UI ↔ backend ground truth (1:1)", () => {
    const uiIds = [...TEMPLATE_BACKEND_IDS].sort();
    const beIds = [...BACKEND_TEMPLATE_IDS_GROUND_TRUTH].sort();
    expect(uiIds).toEqual(beIds);
  });

  it("nessun backendId duplicato in catalog", () => {
    const ids = TEMPLATES_CATALOG.map((t) => t.backendId);
    const unique = new Set(ids);
    expect(unique.size, "duplicato presente").toBe(ids.length);
  });

  it("nessun UI id (es. 't1') duplicato", () => {
    const ids = TEMPLATES_CATALOG.map((t) => t.id);
    const unique = new Set(ids);
    expect(unique.size, "duplicato presente").toBe(ids.length);
  });

  it("nessun codice UC duplicato (es. 'UC1')", () => {
    const ucs = TEMPLATES_CATALOG.map((t) => t.uc);
    const unique = new Set(ucs);
    expect(unique.size, "duplicato presente").toBe(ucs.length);
  });

  it("ogni variant del catalog ha thumbnail SVG in VARIANT_THUMBS", () => {
    for (const t of TEMPLATES_CATALOG) {
      expect(
        VARIANT_THUMBS[t.variant],
        `variant '${t.variant}' del template ${t.uc} senza SVG`,
      ).toBeDefined();
    }
  });

  it("findTemplateByBackendId restituisce match esatto per ogni voce", () => {
    for (const t of TEMPLATES_CATALOG) {
      const found = findTemplateByBackendId(t.backendId);
      expect(found, `lookup ${t.backendId}`).toEqual(t);
    }
  });

  it("findTemplateByBackendId restituisce undefined per ID inesistente", () => {
    expect(findTemplateByBackendId("ex_does_not_exist")).toBeUndefined();
  });

  it("category sempre in dominio enum", () => {
    const validCategories: TemplateEntry["category"][] = [
      "acciaio", "ca", "legno", "sismica", "altro",
    ];
    for (const t of TEMPLATES_CATALOG) {
      expect(validCategories, `template ${t.uc}: category fuori dominio`)
        .toContain(t.category);
    }
  });

  it("badge sempre in dominio enum (se definito)", () => {
    const validBadges: TemplateEntry["badge"][] = ["POPOLARE", "PRO", "NEW", undefined];
    for (const t of TEMPLATES_CATALOG) {
      expect(validBadges, `template ${t.uc}: badge fuori dominio`)
        .toContain(t.badge);
    }
  });
});
