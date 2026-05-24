/**
 * L2 · Mobile flow (T11 v2.3.4-qa).
 *
 * Viewport 390×844 (iPhone) → mobile tabbar visibile, rail desktop nascosta,
 * load template, apri Make da tabbar, more menu.
 */
import { test, expect } from "@playwright/test";
import { authedGoto } from "../shared/helpers";

test.describe("L2 · Mobile flow", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("happy: tabbar visibile, rail desktop nascosta", async ({ page }) => {
    await authedGoto(page, "/");
    await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(800);

    // MobileTabbar visibile (almeno uno dei pattern atteso)
    const tabbar = await page
      .locator('[data-testid="mobile-tabbar"], [data-testid="bottom-nav"], [data-testid*="mobile"]')
      .first();
    const tabbarVisible = await tabbar.isVisible({ timeout: 3000 }).catch(() => false);
    expect.soft(tabbarVisible, "MobileTabbar non visibile su viewport 390x844").toBeTruthy();

    // Desktop rail dovrebbe NON essere visibile (responsive)
    const desktopRail = page.locator('[data-testid="left-rail-desktop"], [data-testid="left-rail"]').first();
    if ((await desktopRail.count()) > 0) {
      const isVisible = await desktopRail.isVisible().catch(() => false);
      expect.soft(isVisible, "Desktop rail visibile in viewport mobile (responsive broken?)").toBeFalsy();
    }
  });

  test("happy: load template via mobile → viewport caricato", async ({ page }) => {
    await authedGoto(page, "/?model=ex_simple_beam_2d");
    await page.waitForTimeout(2000);

    // Viewport canvas visibile
    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible({ timeout: 5000 });
  });
});
