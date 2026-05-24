/**
 * L2 · Edge cases consolidati (T12 v2.3.4-qa).
 */
import { test, expect } from "@playwright/test";
import { authedGoto } from "../shared/helpers";

test.describe("L2 · Edge cases", () => {
  test("palette Ctrl+K → ESC chiude", async ({ page }) => {
    await authedGoto(page, "/");
    await page.waitForTimeout(500);
    await page.keyboard.press("Control+K");
    await page.waitForTimeout(400);
    const palette = page.locator('[data-testid="command-palette"], [role="dialog"]').first();
    await expect(palette).toBeVisible({ timeout: 3000 });
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
    await expect(palette).not.toBeVisible({ timeout: 2000 });
  });

  test("focus mode Shift+Space toggle", async ({ page }) => {
    await authedGoto(page, "/?model=ex_simple_beam_2d");
    await page.waitForTimeout(1500);

    const topbar = page.locator('[data-testid="topbar"]').first();
    const beforeVisible = await topbar.isVisible({ timeout: 1500 }).catch(() => false);

    await page.keyboard.press("Shift+Space");
    await page.waitForTimeout(400);
    const afterVisible = await topbar.isVisible().catch(() => false);

    expect.soft(afterVisible, "Shift+Space (focus mode) non nasconde la topbar").not.toBe(beforeVisible);

    // Toggle back
    await page.keyboard.press("Shift+Space");
    await page.waitForTimeout(400);
  });

  test("viewport: switch Engine toggle 5 volte → no crash console", async ({ page }) => {
    await authedGoto(page, "/?model=ex_portal_frame_2d");
    await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(1500);

    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text().substring(0, 200));
    });

    const engineToggle = page.locator(':text("Engine")').first();
    for (let i = 0; i < 5; i++) {
      if (await engineToggle.isVisible({ timeout: 1000 }).catch(() => false)) {
        await engineToggle.click({ force: true });
        await page.waitForTimeout(300);
      }
    }

    expect.soft(errors, `5 toggle Engine: ${errors.length} errori console`).toHaveLength(0);
  });

  test("URL invalid (?model=non_existent) → graceful fallback", async ({ page }) => {
    await authedGoto(page, "/?model=does_not_exist_xyz");
    await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(1500);

    // App non deve crashare; quantomeno dovrebbe rimanere visibile la home
    // o mostrare un toast errore
    const bodyVisible = await page.locator("body").isVisible();
    expect(bodyVisible).toBeTruthy();

    const hasErrorFeedback = await page
      .locator(':text-matches("(non trovato|errore|404|modello)", "i")')
      .count();
    expect.soft(hasErrorFeedback, "URL model invalid: nessun feedback errore").toBeGreaterThan(0);
  });
});
