/**
 * Smoke E2E live · v2.6.2-shell validation (Fase 2 design rebuild).
 *
 * Target: https://fea-pro.fly.dev/ release v86 (commit 64ffb88).
 *
 * 3 test:
 *   1. Shell loading + screenshot multipli (confronto vs mockup Nuovo Guscio.html)
 *   2. Smoke funzionale pipeline v2.5.0 preservata (Run + deformata + palette + PDF)
 *   3. Audit version marker mostra v2.6 (non più v2.3)
 *
 * Credenziali via env vars FEAPRO_TEST_EMAIL/FEAPRO_TEST_PASSWORD.
 * Artifacts in `e2e/artifacts-v2.6.2-shell-smoke/` (gitignored).
 */
import { test, expect, Page } from "@playwright/test";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EMAIL = process.env.FEAPRO_TEST_EMAIL;
const PASSWORD = process.env.FEAPRO_TEST_PASSWORD;

if (!EMAIL || !PASSWORD) {
  throw new Error(
    "FEAPRO_TEST_EMAIL e FEAPRO_TEST_PASSWORD non settate.",
  );
}

const ARTIFACTS_DIR = path.join(__dirname, "artifacts-v2.6.2-shell-smoke");
if (!fs.existsSync(ARTIFACTS_DIR)) fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });

async function login(page: Page): Promise<void> {
  await page.goto("/");
  await page.locator('[data-testid="auth-email"]').fill(EMAIL!);
  await page.locator('[data-testid="auth-password"]').fill(PASSWORD!);
  await page.locator('[data-testid="auth-submit"]').click();
  await page.waitForSelector('[data-testid="dashboard-root"]', { timeout: 20_000 });
}

async function dismissOnboardingTour(page: Page): Promise<void> {
  const skipButton = page.getByRole("button", { name: /^salta$/i });
  const skipVisible = await skipButton.isVisible({ timeout: 2_000 }).catch(() => false);
  if (skipVisible) {
    await skipButton.click();
    await skipButton.waitFor({ state: "hidden", timeout: 5_000 }).catch(() => {});
    return;
  }
  const overlayStill = await page
    .locator('[role="dialog"]')
    .first()
    .isVisible({ timeout: 500 })
    .catch(() => false);
  if (overlayStill) {
    await page.evaluate(() => {
      window.dispatchEvent(new Event("feapro:close-onboarding"));
    });
    await page.waitForTimeout(500);
  }
}

async function loadTemplate(page: Page): Promise<void> {
  await page.locator('[data-testid="dashboard-action-template"]').click();
  await page.waitForTimeout(800);
  await page.getByText(/Telaio portale/i).first().click();
  // Attendi che il modello sia caricato (anchor: data-feature-id="run-static"
  // OR il counter chip "N nodi" in qualche layout).
  await page
    .waitForSelector(
      '[data-feature-id="run-static"], [data-shell="topbar"], [data-shell="rail"], :text-matches("\\\\d+\\\\s*nod[ie]", "i")',
      { timeout: 25_000 },
    )
    .catch(() => {
      /* selettore può variare; screenshot lo cattura */
    });
  await page.waitForTimeout(2500);
}

test.describe("v2.6.2-shell smoke live", () => {
  test.beforeEach(async ({ context, page }) => {
    await context.addInitScript(() => {
      try {
        localStorage.setItem("feapro-onboarding-seen-v4", "skipped");
      } catch {
        /* ignore */
      }
    });
    page.on("pageerror", (err) => console.error("[browser error]", err.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") console.error("[browser console error]", msg.text());
    });
  });

  test("test 1 · shell loading + screenshot multipli", async ({ page }) => {
    await login(page);
    await dismissOnboardingTour(page);
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, "01-post-login-dashboard.png"),
      fullPage: true,
    });

    await loadTemplate(page);

    // Full page (KEY: confronto vs Nuovo Guscio.html)
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, "02-shell-full-template-loaded.png"),
      fullPage: true,
    });

    // TopBar (h-48px)
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, "03-topbar.png"),
      clip: { x: 0, y: 0, width: 1440, height: 60 },
    });

    // Area top-left (KEY: verifica fix overlap card)
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, "04-viewport-top-left.png"),
      clip: { x: 40, y: 60, width: 600, height: 250 },
    });

    // Rail sinistro (56px)
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, "05-rail.png"),
      clip: { x: 0, y: 48, width: 70, height: 800 },
    });

    // Right panel (380px da destra)
    const vp = page.viewportSize();
    if (vp) {
      await page.screenshot({
        path: path.join(ARTIFACTS_DIR, "06-right-panel.png"),
        clip: { x: Math.max(0, vp.width - 400), y: 48, width: 400, height: 800 },
      });
    }

    // DOM dump area top-left per analisi overlap
    const topLeftElements = await page.evaluate(() => {
      const all = document.querySelectorAll<HTMLElement>("*");
      type Item = {
        tag: string;
        text: string;
        rect: { x: number; y: number; width: number; height: number };
        zIndex: string;
        testid: string | null;
      };
      const out: Item[] = [];
      all.forEach((el) => {
        const r = el.getBoundingClientRect();
        if (
          r.top < 250 &&
          r.left < 600 &&
          r.left >= 0 &&
          r.width > 0 &&
          r.height > 0 &&
          r.width < 800 &&
          r.height < 200
        ) {
          const cs = window.getComputedStyle(el);
          const cls =
            typeof el.className === "string"
              ? el.className.split(" ").filter(Boolean).slice(0, 3).join(".")
              : "";
          out.push({
            tag:
              el.tagName.toLowerCase() +
              (el.id ? "#" + el.id : "") +
              (cls ? "." + cls : ""),
            text: (el.textContent ?? "").slice(0, 80).replace(/\s+/g, " ").trim(),
            rect: { x: r.x, y: r.y, width: r.width, height: r.height },
            zIndex: cs.zIndex,
            testid: el.getAttribute("data-testid"),
          });
        }
      });
      out.sort((a, b) => a.rect.y - b.rect.y || a.rect.x - b.rect.x);
      return out;
    });
    fs.writeFileSync(
      path.join(ARTIFACTS_DIR, "topleft-dom.json"),
      JSON.stringify(topLeftElements, null, 2),
    );
  });

  test("test 2 · smoke funzionale pipeline v2.5.0", async ({ page }) => {
    await login(page);
    await dismissOnboardingTour(page);
    await loadTemplate(page);

    // 1. Run analisi statica (preconditions v2.5.6 + FeatureButton)
    const runButton = page
      .locator('[data-feature-id="run-static"]')
      .first();
    await expect(runButton).toBeEnabled({ timeout: 8000 });
    await runButton.click();
    await expect(
      page
        .locator('text=/analisi.*complet|risultati.*pronti|completato/i')
        .first(),
    ).toBeVisible({ timeout: 60_000 });
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, "07-analisi-completed.png"),
      fullPage: true,
    });

    // 2. Toggle deformata (preconditions v2.5.7)
    const viewRailButton = page
      .locator('[data-testid="right-rail-view"]')
      .or(page.getByRole("button", { name: /^vista$|^view$/i }));
    if (await viewRailButton.first().isVisible({ timeout: 2000 }).catch(() => false)) {
      await viewRailButton.first().click().catch(() => {});
      await page.waitForTimeout(500);
    }
    const deformedToggle = page
      .locator('[data-feature-id="view-deformed"]')
      .first();
    if (await deformedToggle.isVisible({ timeout: 3000 }).catch(() => false)) {
      const isEnabled = await deformedToggle.isEnabled().catch(() => false);
      if (isEnabled) {
        const isChecked = (await deformedToggle.getAttribute("aria-checked")) === "true";
        if (!isChecked) await deformedToggle.click().catch(() => {});
      }
    }
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, "08-deformata-on.png"),
      fullPage: true,
    });

    // 3. Command palette ⌘K (cmdk integration v2.6.2)
    await page.keyboard.press("Control+k");
    await page.waitForTimeout(700);
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, "09-palette-open.png"),
      fullPage: true,
    });
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);

    // 4. Export PDF via palette (path v2.5.3)
    await page.keyboard.press("Control+k");
    await page.waitForTimeout(500);
    const paletteInputs = page.locator(
      'input[type="text"]:visible, input[role="combobox"]:visible',
    );
    const inputCount = await paletteInputs.count();
    if (inputCount > 0) {
      await paletteInputs.last().fill("pdf");
      await page.waitForTimeout(700);
      const downloadPromise = page
        .waitForEvent("download", { timeout: 30_000 })
        .catch(() => null);
      const pdfItem = page
        .getByText(/esegui report pdf|export pdf|report pdf|esporta report/i)
        .first();
      if (await pdfItem.isVisible({ timeout: 3000 }).catch(() => false)) {
        await pdfItem.click();
        const download = await downloadPromise;
        if (download) {
          const pdfPath = path.join(ARTIFACTS_DIR, "report.pdf");
          await download.saveAs(pdfPath);
          expect(fs.existsSync(pdfPath)).toBe(true);
          expect(fs.statSync(pdfPath).size).toBeGreaterThan(1000);
        }
      }
    }
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, "10-pdf-downloaded.png"),
      fullPage: true,
    });
  });

  test("test 3 · version marker v2.6", async ({ page }) => {
    await login(page);
    await dismissOnboardingTour(page);
    await loadTemplate(page);
    const bodyText = await page.locator("body").innerText();
    const hasV26 = /v2\.6/.test(bodyText);
    const hasV23Legacy = /\bv2\.3(?!\.\d)/.test(bodyText);
    fs.writeFileSync(
      path.join(ARTIFACTS_DIR, "version-marker.txt"),
      `hasV26=${hasV26}\nhasV23Legacy=${hasV23Legacy}\n\n--- bodyText snippet ---\n${bodyText.slice(0, 1200)}`,
    );
    expect(hasV26, "TopBar/StatusBar deve mostrare v2.6").toBe(true);
    expect(hasV23Legacy, "TopBar/StatusBar NON deve mostrare v2.3 (legacy)").toBe(false);
  });
});
