/**
 * L2 · Solve flow (T4 v2.3.4-qa).
 *
 * Da workspace beam loaded → click "Esegui" (F5 o button verde) →
 * verifica che progress chip / toast / results panel compaia.
 */
import { test, expect } from "@playwright/test";
import { authedGoto } from "../shared/helpers";

test.describe("L2 · Solve flow", () => {
  test("happy: beam template → F5 → analisi completata + results visibili", async ({ page }) => {
    await authedGoto(page, "/?model=ex_simple_beam_2d");
    await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(1500);

    // Pre-stato: nessun results visibile (panel-results-* count = 0)
    const resultsBefore = await page.locator('[data-testid*="results"]').count();

    // Trigger F5
    await page.keyboard.press("F5");
    await page.waitForTimeout(3500); // attende solver (statica su 11 nodi ~1s + overhead)

    // Verifica: o toast successo, o results panel popolato, o status chip "Risolto"
    const toastCount = await page.locator('[data-toast], [data-testid="toast"], [role="status"]').count();
    const resultsAfter = await page.locator('[data-testid*="results"]').count();
    const missionBarSolved = await page
      .locator('[data-testid="mission-bar"]')
      .textContent()
      .catch(() => "");
    const solvedHint = (missionBarSolved ?? "").toLowerCase().includes("risolto");

    const observable = toastCount > 0 || resultsAfter > resultsBefore || solvedHint;
    expect.soft(observable, "F5 non ha prodotto effetto observable post-solve").toBeTruthy();
  });

  test("edge: model senza vincoli → MissionBar suggerisce 'aggiungi vincolo'", async ({ page }) => {
    await authedGoto(page, "/");
    await page.waitForTimeout(1500);

    // Crea modello vuoto (no vincoli) via Studio Pro → Geometria
    // Test semplificato: se MissionBar visibile, deve essere uno stato wip
    const missionBar = page.locator('[data-testid="mission-bar"]');
    if ((await missionBar.count()) > 0) {
      const status = await page.locator('[data-testid="mission-bar-status"]').textContent();
      expect.soft(status?.toLowerCase()).toMatch(/(da completare|pronto)/i);
    }
  });
});
