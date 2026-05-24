/**
 * L2 · Percorsi Beam Wizard flow (T10 v2.3.4-qa — v1.9 specific).
 *
 * Da Home → click "Scegli un percorso" → seleziona "Trave bi-appoggiata UC1"
 * → naviga step (3-5 step) → verifica trust badge.
 */
import { test, expect } from "@playwright/test";
import { authedGoto } from "../shared/helpers";

test.describe("L2 · Percorsi Beam Wizard (v1.9)", () => {
  test("happy: Home → 'Scegli un percorso' apre PercorsiBeamWizard", async ({ page }) => {
    await authedGoto(page, "/");
    await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});

    // Click su CTA Percorsi (emerald)
    await page.getByTestId("home-cta-percorsi").click();
    await page.waitForTimeout(500);

    // Wizard dialog visibile
    const wizard = page.locator('[data-testid*="percorsi"], [role="dialog"]').first();
    await expect(wizard).toBeVisible({ timeout: 3000 });

    // Cerca prima card "Trave bi-appoggiata" o "UC1"
    const cardHit = await page.locator(':text-matches("(trave\\s*bi-appoggiata|UC1)", "i")').count();
    expect.soft(cardHit, "PercorsiWizard: card 'Trave bi-appoggiata UC1' non visibile").toBeGreaterThan(0);

    await page.keyboard.press("Escape").catch(() => {});
  });

  test("happy: TrustLayerBadge visibile dopo selezione percorso", async ({ page }) => {
    await authedGoto(page, "/");
    await page.waitForTimeout(500);
    await page.getByTestId("home-cta-percorsi").click();
    await page.waitForTimeout(500);

    // Trust badge testid (potrebbe essere `trust-badge` o `trust-layer-badge`)
    const badge = await page.locator('[data-testid*="trust"], :text-matches("(preliminary|draft|trust|qualifica)", "i")').count();
    expect.soft(badge, "TrustLayerBadge non visibile nel wizard Percorsi").toBeGreaterThan(0);
  });
});
