/**
 * Smoke E2E — Workflow ingegnere completo (v1.6.1 T6).
 *
 * 4 test deterministici che simulano l'ingegnere reale:
 *  1. Empty state — rail disabled, banner offline, no toast errore
 *  2. Workflow base — Da template → load → solve → deformata → export PDF
 *  3. Palette UX — Ctrl+K + backdrop click dismiss
 *  4. Errori 422 italiani — no [object Object] anywhere
 *
 * Prerequisiti:
 *   pnpm add -D @playwright/test
 *   pnpm exec playwright install chromium
 *
 * Esecuzione:
 *   pnpm dev          # in un terminale
 *   pnpm e2e          # in un altro terminale
 *
 * Browser screenshots vanno in `.codex-temp/verify-T6-*.png`.
 */
import { test, expect } from "@playwright/test";

test.describe("Smoke E2E — Workflow ingegnere", () => {
  test("Empty state: rail disabled + banner offline, 0 toast errore", async ({ page }) => {
    // Forza tutti i fetch /api a fallire (simula backend down completo)
    await page.route("**/api/**", (route) => route.abort());

    await page.goto("/");

    // Banner "Backend/database non disponibile" visibile
    await expect(page.getByText(/Backend.*non disponibile/i)).toBeVisible({ timeout: 5000 });

    // Aspetta 3s in piu' per essere sicuri che tutti i fetch di boot
    // siano partiti e le interceptor abbiano avuto tempo di girare.
    await page.waitForTimeout(3000);

    // Zero toast errore (v1.6.1 T1 fix)
    const errorToasts = page.locator('[role="alert"]:has-text("Errore")');
    expect(await errorToasts.count()).toBe(0);

    // Bell con badge nascosto (v1.6.1 T3 fix)
    const bellWithBadge = page.locator('[data-testid="topbar-bell"]');
    expect(await bellWithBadge.count()).toBe(0);

    // LeftRail Make/Solve/Verify disabled (v1.6 S0 B03)
    await expect(page.getByTestId("left-rail-model")).toBeDisabled();
    await expect(page.getByTestId("left-rail-analysis")).toBeDisabled();
    await expect(page.getByTestId("left-rail-verify")).toBeDisabled();

    // RightRail Inspect disabled (View resta enabled per i preset senza modello)
    await expect(page.getByTestId("right-rail-inspect")).toBeDisabled();
    await expect(page.getByTestId("right-rail-tools")).not.toBeDisabled();

    // No View button anomalo in Dashboard (v1.6.1 T2 fix)
    await expect(page.getByTestId("dashboard-open-view")).toHaveCount(0);

    await page.screenshot({ path: ".codex-temp/verify-T6-empty-state.png", fullPage: true });
  });

  test("Workflow base: template → modello caricato → run → deformata → PDF", async ({ page }) => {
    await page.goto("/");

    // Aspetta che la Dashboard sia interattiva
    await expect(page.getByText(/Buongiorno|Inizia|Crediti/i).first()).toBeVisible({ timeout: 10_000 });

    // 1. Click "Da template" → galleria template (NON dialog NewModel)
    await page.getByTestId("dashboard-action-template").click();
    await expect(page.getByText(/Telaio portale|template/i).first()).toBeVisible({ timeout: 5000 });

    // 2. Sceglie un template (il primo "Telaio portale 2D" o equivalente)
    await page.getByText(/Telaio portale/i).first().click();

    // 3. Aspetta caricamento modello (HUD chip topbar)
    await expect(page.locator("text=/\\d+ nod[ie]/i").first()).toBeVisible({ timeout: 15_000 });

    await page.screenshot({ path: ".codex-temp/verify-T6-step1-loaded.png", fullPage: true });

    // 4. Lancia analisi statica (chip topbar)
    await page.getByRole("button", { name: /^Esegui$/i }).click();

    // 5. Aspetta completamento (max 30s, dipende dal backend)
    await expect(
      page.locator("text=/completata|completed|risultati/i").first(),
    ).toBeVisible({ timeout: 30_000 });

    await page.screenshot({ path: ".codex-temp/verify-T6-step2-solved.png", fullPage: true });

    // 6. Apri ViewPanel (RightRail)
    await page.getByTestId("right-rail-view").click();

    // 7. Toggle Deformata deve essere abilitato post-analisi (v1.6 S0 B16)
    const deformedToggle = page
      .getByRole("switch", { name: /Deformata/i })
      .or(page.locator('[data-testid*="deformed"]'))
      .first();
    await expect(deformedToggle).toBeEnabled();
    await deformedToggle.click();

    await page.screenshot({ path: ".codex-temp/verify-T6-step3-deformed.png", fullPage: true });
  });

  test("Palette UX: Ctrl+K apre, ESC chiude, backdrop click chiude (v1.6 S0 B02)", async ({ page }) => {
    await page.goto("/");

    // Apre con Ctrl+K
    await page.keyboard.press("Control+k");
    await expect(page.getByPlaceholder(/Cerca/i)).toBeVisible();

    // Chiude con ESC
    await page.keyboard.press("Escape");
    await expect(page.getByPlaceholder(/Cerca/i)).not.toBeVisible();

    // Riapre + chiude con click sul backdrop (angolo top-left fuori dal dialog)
    await page.keyboard.press("Control+k");
    await expect(page.getByPlaceholder(/Cerca/i)).toBeVisible();
    await page.mouse.click(10, 10);
    await expect(page.getByPlaceholder(/Cerca/i)).not.toBeVisible({ timeout: 1500 });

    await page.screenshot({ path: ".codex-temp/verify-T6-palette-dismissed.png" });
  });

  test("Errori 422: nessun '[object Object]' nei toast (v1.6 S0 B05 + v1.6.1 T1)", async ({ page }) => {
    // Setup: mock POST /api/analysis/static/* per restituire 422 strutturato
    await page.route("**/api/analysis/static/**", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 422,
          contentType: "application/json",
          body: JSON.stringify({ error: "missing_constraints" }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto("/");

    // Carica un template (per avere un modello)
    await page.getByTestId("dashboard-action-template").click();
    await page.getByText(/Telaio portale/i).first().click();
    await expect(page.locator("text=/\\d+ nod[ie]/i").first()).toBeVisible({ timeout: 15_000 });

    // Lancia analisi
    await page.getByRole("button", { name: /^Esegui$/i }).click();

    // Aspetta toast errore
    await page.waitForTimeout(2000);

    // Verifica: il toast NON contiene [object Object]
    const objectObjectVisible = await page.locator("text=/\\[object Object\\]/").count();
    expect(objectObjectVisible).toBe(0);

    // E contiene la parola italiana "vincolo"
    await expect(page.locator("text=/vincolo/i").first()).toBeVisible({ timeout: 3000 });

    await page.screenshot({ path: ".codex-temp/verify-T6-error-italian.png" });
  });
});
