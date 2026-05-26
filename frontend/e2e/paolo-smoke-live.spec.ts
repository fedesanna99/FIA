/**
 * Smoke E2E live · flow Paolo (v2.5.0-paolo-ready validation).
 *
 * Target: https://fea-pro.fly.dev/ (production, vedi playwright.smoke-live.config.ts).
 *
 * 1 test che copre 4 step Paolo:
 *   STEP 0 · Login email+password
 *   STEP 1 · Apri template "Telaio portale 2D" dalla Dashboard
 *   STEP 2 · Esegui analisi statica + verifica completamento
 *   STEP 3 · Toggle "Deformata" abilitato post-statica + click
 *   STEP 4 · Export PDF via command palette Ctrl+K + verifica download + toast
 *
 * Credenziali via env vars FEAPRO_TEST_EMAIL/FEAPRO_TEST_PASSWORD (mai committate).
 * Screenshot di evidenza in `e2e/artifacts-smoke-live/` (gitignored).
 *
 * Esecuzione:
 *   FEAPRO_TEST_EMAIL=... FEAPRO_TEST_PASSWORD=... \
 *     pnpm exec playwright test paolo-smoke-live.spec.ts \
 *     --config=playwright.smoke-live.config.ts --reporter=list
 */
import { test, expect, Page } from "@playwright/test";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

// Compat ESM (vitest/playwright spesso usano ESM, __dirname non è definito).
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EMAIL = process.env.FEAPRO_TEST_EMAIL;
const PASSWORD = process.env.FEAPRO_TEST_PASSWORD;

if (!EMAIL || !PASSWORD) {
  throw new Error(
    "FEAPRO_TEST_EMAIL e FEAPRO_TEST_PASSWORD non settate. " +
      "Esempio: FEAPRO_TEST_EMAIL=... FEAPRO_TEST_PASSWORD=... pnpm exec playwright test paolo-smoke-live.spec.ts --config=playwright.smoke-live.config.ts",
  );
}

const ARTIFACTS_DIR = path.join(__dirname, "artifacts-smoke-live");
if (!fs.existsSync(ARTIFACTS_DIR)) fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });

async function login(page: Page): Promise<void> {
  await page.goto("/");
  // AuthGate mostra AuthScreen se user === null. NO URL change post-login —
  // l'app resta a `/`, ma il `data-testid="dashboard-root"` appare.
  // Default mode è "login", quindi non serve cliccare il tab.

  await page.locator('[data-testid="auth-email"]').fill(EMAIL!);
  await page.locator('[data-testid="auth-password"]').fill(PASSWORD!);
  await page.locator('[data-testid="auth-submit"]').click();

  // Attende il mount della Dashboard (l'AuthGate ha smontato l'AuthScreen).
  await page.waitForSelector('[data-testid="dashboard-root"]', { timeout: 20_000 });
}

test.describe("Smoke E2E live · flow Paolo", () => {
  test.beforeEach(async ({ page }) => {
    page.on("pageerror", (err) => console.error("[browser error]", err.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") console.error("[browser console error]", msg.text());
    });
  });

  test("flow completo: telaio 2D → statica → deformata → export PDF", async ({ page }) => {
    // ───── STEP 0 · Login ─────
    await login(page);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, "01-post-login.png"), fullPage: true });

    // ───── STEP 1 · Apri template "Telaio portale 2D" ─────
    // Dashboard ha 4 QuickAct, usiamo quello "Da template" (test-id stabile).
    await page.locator('[data-testid="dashboard-action-template"]').click();

    // TemplateGalleryDialog si apre. Snapshot per evidenza.
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, "02-template-dialog.png"),
      fullPage: true,
    });

    // Cerca il template "Telaio portale". Pattern identico al
    // smoke-engineer-workflow.spec.ts esistente.
    await page.getByText(/Telaio portale/i).first().click();

    // Attende che il modello sia caricato. Anchor: HUD chip "N nodi"
    // oppure presenza del FeatureButton run-static (post v2.5.6).
    await page.waitForSelector(
      '[data-feature-id="run-static"], :text-matches("\\\\d+\\\\s*nod[ie]", "i")',
      { timeout: 20_000 },
    );
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, "03-template-loaded.png"),
      fullPage: true,
    });

    // ───── STEP 2 · Esegui analisi statica ─────
    // Aspettativa post v2.5.6 (BUG-027 fix): il button è enabled solo se
    // il template ha vincoli + carichi, che il template "Telaio portale 2D"
    // dovrebbe avere by default.
    const runButton = page.locator('[data-feature-id="run-static"]').first();
    await expect(runButton).toBeEnabled({ timeout: 5_000 });
    await runButton.click();

    // Attende completamento. Pattern tolerant: testo italiano variabile.
    await expect(
      page
        .locator('text=/analisi.*complet|risultati.*pronti|completato/i')
        .first(),
    ).toBeVisible({ timeout: 60_000 });
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, "04-static-completed.png"),
      fullPage: true,
    });

    // ───── STEP 3 · Toggle "Deformata" ─────
    // Apre il pannello Vista nel rail destro (label italiano post v2.5.8).
    const viewRailButton = page
      .locator('[data-testid="right-rail-view"]')
      .or(page.getByRole("button", { name: /^vista$/i }))
      .first();
    if (await viewRailButton.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await viewRailButton.click();
    }

    // Toggle "Deformata" (post v2.5.7: usa data-feature-id="view-deformed"
    // o data-testid="view-toggle-deformed" come fallback).
    const deformedToggle = page
      .locator('[data-feature-id="view-deformed"]')
      .or(page.locator('[data-testid="view-toggle-deformed"]'))
      .first();
    await expect(deformedToggle).toBeEnabled({ timeout: 5_000 });

    // Click solo se non già attivo. Checkbox usa `checked` attr, FeatureButton
    // usa aria-disabled.
    const wasChecked =
      (await deformedToggle.evaluate(
        (el) =>
          (el as HTMLInputElement).checked ??
          el.getAttribute("aria-checked") === "true",
      )) === true;
    if (!wasChecked) {
      await deformedToggle.click();
    }
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, "05-deformata-on.png"),
      fullPage: true,
    });

    // ───── STEP 4 · Export PDF via command palette ─────
    await page.keyboard.press("Control+k");
    // Aspetta che la palette sia visibile (placeholder "Cerca…" o input focus).
    await page.locator(':text-matches("Cerca", "i")').first().waitFor({ timeout: 5_000 });
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, "06-palette-open.png"),
      fullPage: true,
    });

    // Cerca "pdf" nella palette. L'input è di cmdk (Command) library.
    const paletteInput = page.locator('input[type="text"], input[role="searchbox"]').last();
    await paletteInput.fill("pdf");
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, "07-palette-pdf.png"),
      fullPage: true,
    });

    // Setup listener download prima del click (pattern Playwright).
    const downloadPromise = page.waitForEvent("download", { timeout: 30_000 });

    // Selezione prima voce PDF. Le voci disponibili (paletteItems.ts):
    //   - "Apri report export PDF" (wiz-report, actionKind open-wizard)
    //   - "Esporta · PDF report completo" (exp-pdf-full, actionKind quick-export)
    // Preferenza: quick-export che usa generateReport diretto + toast post v2.5.3.
    await page
      .locator('[role="option"], [data-cmdk-item], [cmdk-item]')
      .filter({ hasText: /pdf/i })
      .first()
      .click();

    const download = await downloadPromise;
    const downloadPath = path.join(ARTIFACTS_DIR, "report.pdf");
    await download.saveAs(downloadPath);
    expect(fs.existsSync(downloadPath)).toBe(true);
    expect(fs.statSync(downloadPath).size).toBeGreaterThan(1000);

    // Toast successo (post v2.5.3 fix: "Report PDF scaricato.")
    await expect(
      page.locator('text=/report pdf (scaricato|generato)/i').first(),
    ).toBeVisible({ timeout: 10_000 });
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, "08-pdf-downloaded.png"),
      fullPage: true,
    });
  });
});
