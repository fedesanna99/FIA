/**
 * dump-hud.spec.ts (v2.5.0-paolo-ready-hud-overlap-investigation T2)
 *
 * Investigation P0: la card "Telaio portale 2D" top-left copre almeno un
 * altro elemento UI. Questo test:
 *   1. Login + carica template
 *   2. Screenshot zoomato area top-left (clip 1100x250)
 *   3. DOM dump degli elementi nell'area, con rect/zIndex/text per analisi
 *   4. Screenshot di 5 viste principali per audit sistemico (T4)
 *
 * Output in `e2e/artifacts-hud-dump/` (gitignored).
 */
import { test, Page } from "@playwright/test";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EMAIL = process.env.FEAPRO_TEST_EMAIL;
const PASSWORD = process.env.FEAPRO_TEST_PASSWORD;
if (!EMAIL || !PASSWORD) {
  throw new Error("FEAPRO_TEST_EMAIL e FEAPRO_TEST_PASSWORD non settate.");
}

const OUT = path.join(__dirname, "artifacts-hud-dump");
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

async function login(page: Page): Promise<void> {
  await page.goto("/");
  await page.locator('[data-testid="auth-email"]').fill(EMAIL!);
  await page.locator('[data-testid="auth-password"]').fill(PASSWORD!);
  await page.locator('[data-testid="auth-submit"]').click();
  await page.waitForSelector('[data-testid="dashboard-root"]', { timeout: 20_000 });
}

async function dismissTour(page: Page): Promise<void> {
  const skip = page.getByRole("button", { name: /^salta$/i });
  if (await skip.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await skip.click().catch(() => {});
  }
}

interface ElementDump {
  tag: string;
  id: string;
  classes: string;
  testid: string | null;
  text: string;
  rect: { x: number; y: number; width: number; height: number };
  zIndex: string;
  opacity: string;
  position: string;
  background: string;
  borderColor: string;
}

async function dumpTopLeft(page: Page, label: string): Promise<void> {
  // Clip zoom 1100×260: copre l'area sotto la topbar (60px) + tutta la riga
  // chip dello ViewportHud (top-3.5 ≈ 14px → fino a ~250px y).
  await page.screenshot({
    path: path.join(OUT, `${label}-topleft.png`),
    clip: { x: 0, y: 0, width: 1100, height: 260 },
  });

  await page.screenshot({
    path: path.join(OUT, `${label}-fullpage.png`),
    fullPage: true,
  });

  const elements: ElementDump[] = await page.evaluate(() => {
    const out: Array<{
      tag: string;
      id: string;
      classes: string;
      testid: string | null;
      text: string;
      rect: { x: number; y: number; width: number; height: number };
      zIndex: string;
      opacity: string;
      position: string;
      background: string;
      borderColor: string;
    }> = [];
    document.querySelectorAll<HTMLElement>("*").forEach((el) => {
      const r = el.getBoundingClientRect();
      // Solo elementi nell'area top-left target + non zero size + non wrapper enormi
      if (
        r.top < 260 &&
        r.left < 1100 &&
        r.left >= 0 &&
        r.width > 0 &&
        r.height > 0 &&
        r.width < 1100 &&
        r.height < 200
      ) {
        const cs = window.getComputedStyle(el);
        const text = (el.textContent ?? "").slice(0, 100).replace(/\s+/g, " ").trim();
        out.push({
          tag: el.tagName.toLowerCase(),
          id: el.id || "",
          classes:
            typeof el.className === "string"
              ? el.className.split(" ").slice(0, 8).join(" ")
              : "",
          testid: el.getAttribute("data-testid"),
          text: text.length > 80 ? text.slice(0, 80) + "…" : text,
          rect: { x: r.x, y: r.y, width: r.width, height: r.height },
          zIndex: cs.zIndex,
          opacity: cs.opacity,
          position: cs.position,
          background: cs.backgroundColor,
          borderColor: cs.borderColor,
        });
      }
    });
    return out;
  });

  // Sort per y crescente, poi x crescente
  elements.sort((a, b) => a.rect.y - b.rect.y || a.rect.x - b.rect.x);

  fs.writeFileSync(
    path.join(OUT, `${label}-elements.json`),
    JSON.stringify(elements, null, 2),
  );

  // Vista compatta: solo chip/card con testo significativo + visibili
  const summary = elements
    .filter((e) => e.text.length > 0 && e.opacity !== "0" && e.rect.height >= 12)
    .map((e) => ({
      y: Math.round(e.rect.y),
      x: Math.round(e.rect.x),
      w: Math.round(e.rect.width),
      h: Math.round(e.rect.height),
      z: e.zIndex,
      testid: e.testid,
      text: e.text,
    }));
  fs.writeFileSync(
    path.join(OUT, `${label}-summary.json`),
    JSON.stringify(summary, null, 2),
  );
}

test.describe("HUD overlap investigation", () => {
  test.beforeEach(async ({ context, page }) => {
    await context.addInitScript(() => {
      try {
        localStorage.setItem("feapro-onboarding-seen-v4", "skipped");
      } catch {
        /* ignore */
      }
    });
    page.on("pageerror", (err) => console.error("[browser error]", err.message));
  });

  test("dump topleft + 5 viste principali", async ({ page }) => {
    // ── STEP 0 · login + tour dismissed ──
    await login(page);
    await dismissTour(page);

    // ── STEP 1 · carica Telaio portale 2D ──
    await page.locator('[data-testid="dashboard-action-template"]').click();
    // Aspetta che il dialog si apra (o screenshot per debug se non si apre)
    await page.waitForTimeout(1500);
    await page
      .getByText(/Telaio portale/i)
      .first()
      .click()
      .catch(() => {});
    const conferma = page.getByRole("button", { name: /apri|conferma|crea|carica/i }).first();
    if (await conferma.isVisible({ timeout: 2000 }).catch(() => false)) {
      await conferma.click();
    }
    // Attende stabilizzazione modello + ViewportHud render
    await page.waitForTimeout(3000);

    // ── DUMP 1 · vista default post-template (Dashboard o workspace?) ──
    await dumpTopLeft(page, "01-after-template");

    // ── DUMP 2 · esegui statica (apre Solve panel) ──
    // Prova prima il button TopBar "Esegui" (vecchio pattern), poi il FeatureButton SolvePanel.
    const topbarRun = page.getByRole("button", { name: /^esegui$/i }).first();
    if (await topbarRun.isVisible({ timeout: 2000 }).catch(() => false)) {
      await topbarRun.click().catch(() => {});
      await page.waitForTimeout(8000); // analisi dovrebbe completare
    }
    await dumpTopLeft(page, "02-after-static");

    // ── DUMP 3 · apri SolvePanel (left rail) per testare con pannello aperto ──
    const leftRailAnalysis = page
      .locator('[data-testid="left-rail-analysis"]')
      .or(page.getByRole("button", { name: /solve|analisi/i }))
      .first();
    if (await leftRailAnalysis.isVisible({ timeout: 2000 }).catch(() => false)) {
      await leftRailAnalysis.click().catch(() => {});
      await page.waitForTimeout(1000);
    }
    await dumpTopLeft(page, "03-solvepanel-open");

    // ── DUMP 4 · apri InspectPanel (right rail) ──
    const rightRailInspect = page
      .locator('[data-testid="right-rail-inspect"]')
      .or(page.getByRole("button", { name: /inspect|ispeziona/i }))
      .first();
    if (await rightRailInspect.isVisible({ timeout: 2000 }).catch(() => false)) {
      await rightRailInspect.click().catch(() => {});
      await page.waitForTimeout(1000);
    }
    await dumpTopLeft(page, "04-inspect-open");

    // ── DUMP 5 · apri ViewPanel ──
    const rightRailView = page
      .locator('[data-testid="right-rail-view"]')
      .or(page.getByRole("button", { name: /^view$|^vista$/i }))
      .first();
    if (await rightRailView.isVisible({ timeout: 2000 }).catch(() => false)) {
      await rightRailView.click().catch(() => {});
      await page.waitForTimeout(1000);
    }
    await dumpTopLeft(page, "05-view-open");
  });
});
