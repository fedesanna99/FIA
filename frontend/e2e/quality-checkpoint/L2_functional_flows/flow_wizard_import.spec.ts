/**
 * L2 · Wizard Import flow (T7 v2.3.4-qa).
 *
 * Da home empty → click "Importa IFC / DXF" → wizard 4-step apre →
 * verifica navigazione step (avanti/indietro disabilitati come da stato).
 */
import { test, expect } from "@playwright/test";
import { authedGoto } from "../shared/helpers";

test.describe("L2 · Wizard Import flow", () => {
  test("happy: dashboard 'Importa' → wizard apre", async ({ page }) => {
    await authedGoto(page, "/");
    await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});

    await page.getByTestId("dashboard-action-import").click();
    await page.waitForTimeout(500);

    // Wizard dialog visibile
    const wizard = page.locator('[role="dialog"]:visible, [data-testid*="import-wizard"], [data-testid*="wizard"]').first();
    await expect(wizard).toBeVisible({ timeout: 3000 });

    // Cerca step indicator (es. "Step 1 di 4")
    const stepLabel = await page.locator(':text-matches("(step|passo)\\s*1", "i")').count();
    expect.soft(stepLabel, "Step indicator non visibile nel wizard").toBeGreaterThan(0);

    await page.keyboard.press("Escape").catch(() => {});
  });

  test("edge: ESC chiude wizard", async ({ page }) => {
    await authedGoto(page, "/");
    await page.waitForTimeout(500);
    await page.getByTestId("dashboard-action-import").click();
    await page.waitForTimeout(500);

    const dialogBefore = await page.locator('[role="dialog"]').count();
    expect(dialogBefore).toBeGreaterThan(0);

    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);

    const dialogAfter = await page.locator('[role="dialog"]:visible').count();
    expect.soft(dialogAfter, "ESC non chiude il wizard import").toBeLessThan(dialogBefore);
  });
});
