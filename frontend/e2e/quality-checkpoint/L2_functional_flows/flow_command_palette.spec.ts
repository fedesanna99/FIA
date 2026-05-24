/**
 * L2 · Command Palette flow (T8 v2.3.4-qa).
 *
 * Ctrl+K apre palette, search "trave" trova voci, Enter o click esegue.
 */
import { test, expect } from "@playwright/test";
import { authedGoto } from "../shared/helpers";

test.describe("L2 · Command Palette flow", () => {
  test("happy: Ctrl+K apre palette + search 'trave' trova voci", async ({ page }) => {
    await authedGoto(page, "/");
    await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(500);

    // Apri palette
    await page.keyboard.press("Control+K");
    await page.waitForTimeout(400);

    const palette = page.locator('[data-testid="command-palette"], [role="dialog"]').first();
    await expect(palette).toBeVisible({ timeout: 2000 });

    // Search "trave"
    const input = page.locator('input[type="text"], input[role="searchbox"]').first();
    await input.fill("trave");
    await page.waitForTimeout(400);

    // Almeno una voce contenente "trave" (case-insensitive)
    const hits = await page.locator(':text-matches("trave", "i")').count();
    expect.soft(hits, "Palette 'trave' non trova voci").toBeGreaterThan(0);

    // Chiudi con ESC
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    await expect(palette).not.toBeVisible({ timeout: 2000 });
  });

  test("edge: Ctrl+K + click backdrop chiude", async ({ page }) => {
    await authedGoto(page, "/");
    await page.waitForTimeout(500);
    await page.keyboard.press("Control+K");
    await page.waitForTimeout(400);
    const palette = page.locator('[data-testid="command-palette"], [role="dialog"]').first();
    await expect(palette).toBeVisible();

    // Click in alto a sinistra (backdrop)
    await page.mouse.click(5, 5);
    await page.waitForTimeout(400);

    // Palette dovrebbe essersi chiusa
    const stillVisible = await palette.isVisible().catch(() => false);
    expect.soft(stillVisible, "Click backdrop non chiude palette").toBeFalsy();
  });
});
