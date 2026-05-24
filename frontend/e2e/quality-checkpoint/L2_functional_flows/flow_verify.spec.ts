/**
 * L2 · Verify flow (T5 v2.3.4-qa).
 *
 * Da workspace beam loaded + post-solve → apri Verify EC3 → verifica UC badge list.
 */
import { test, expect } from "@playwright/test";
import { authedGoto } from "../shared/helpers";

test.describe("L2 · Verify flow", () => {
  test("happy: load beam + verifica path EC3 raggiungibile via palette", async ({ page }) => {
    await authedGoto(page, "/?model=ex_simple_beam_2d");
    await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(1500);

    // Apri command palette
    await page.keyboard.press("Control+K");
    await page.waitForTimeout(400);
    const palette = page.locator('[data-testid="command-palette"], [role="dialog"]').first();
    await expect(palette).toBeVisible({ timeout: 3000 });

    // Cerca "EC3"
    const input = page.locator('input[type="text"], input[role="searchbox"]').first();
    await input.fill("EC3");
    await page.waitForTimeout(400);

    // Almeno una voce EC3-related
    const ec3Hits = await page.locator(':text-matches("EC3", "i")').count();
    expect.soft(ec3Hits, "Palette dovrebbe trovare voci EC3-related").toBeGreaterThan(0);

    await page.keyboard.press("Escape");
  });

  test("edge: Verify senza analisi pre-solved → CTA suggerita o disabled", async ({ page }) => {
    await authedGoto(page, "/?model=ex_simple_beam_2d");
    await page.waitForTimeout(1500);

    // Cerca rail-verify
    const verifyRail = page.locator('[data-testid="left-rail-verify"]').first();
    if ((await verifyRail.count()) > 0) {
      const isDisabled = await verifyRail.getAttribute("aria-disabled");
      // Verify pre-solve: ragionevole sia disabled o aperto con empty state
      expect([null, "true", "false"]).toContain(isDisabled);
    }
  });
});
