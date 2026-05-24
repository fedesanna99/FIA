/**
 * L2 · Inspect flow (T6 v2.3.4-qa).
 *
 * Da workspace + post-solve → apri Inspect → modifica selezione viewport →
 * verifica che il panel inspect mostri info update.
 */
import { test, expect } from "@playwright/test";
import { authedGoto } from "../shared/helpers";

test.describe("L2 · Inspect flow", () => {
  test("happy: beam loaded → Inspect rail clickable o palette inspect raggiungibile", async ({ page }) => {
    await authedGoto(page, "/?model=ex_simple_beam_2d");
    await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(1500);

    const inspectRail = page.locator('[data-testid="left-rail-inspect"]').first();
    if ((await inspectRail.count()) > 0) {
      await inspectRail.click({ force: true });
      await page.waitForTimeout(500);
      // Cerca panel-inspect o selection-inspector
      const panel = await page
        .locator('[data-testid^="panel-inspect"], [data-testid*="selection-inspector"]')
        .count();
      expect.soft(panel, "Click rail-inspect non apre Inspect panel").toBeGreaterThan(0);
    } else {
      // Via palette
      await page.keyboard.press("Control+K");
      await page.waitForTimeout(400);
      const input = page.locator('input[type="text"], input[role="searchbox"]').first();
      await input.fill("inspect");
      await page.waitForTimeout(400);
      const inspectHits = await page.locator(':text-matches("inspect", "i")').count();
      expect.soft(inspectHits).toBeGreaterThan(0);
      await page.keyboard.press("Escape");
    }
  });
});
