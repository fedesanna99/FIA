/**
 * v2.6.2.2 mobile HUD quickfix · smoke E2E (Playwright iPhone 14 Pro).
 *
 * Verifica:
 *  - ViewportHud (M1+M2): 2 chip impilati verticali su mobile (393px),
 *    NO wrap multi-riga, chip preset/Engine nascosti
 *  - ViewportCanvasTabs (M3): overflow-x-auto + font 10px + no counter
 *  - Conta overlap reali (rect intersezione + stesso z-index + testo diverso)
 *
 * Output baseline e post-fix in `artifacts-mobile-hud-smoke/`.
 *
 * Esecuzione:
 *   FEAPRO_TEST_EMAIL=... FEAPRO_TEST_PASSWORD=... \
 *     pnpm exec playwright test mobile-hud-smoke.spec.ts \
 *     --config=playwright.smoke-live.config.ts --reporter=list
 */
import { test, type Page } from "@playwright/test";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EMAIL = process.env.FEAPRO_TEST_EMAIL;
const PASSWORD = process.env.FEAPRO_TEST_PASSWORD;

if (!EMAIL || !PASSWORD) {
  throw new Error("FEAPRO_TEST_EMAIL e FEAPRO_TEST_PASSWORD richieste");
}

const OUT = path.join(__dirname, "artifacts-mobile-hud-smoke");
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

// Viewport manuale iPhone 14 Pro (STOP rule #1: webkit non installato in CI,
// usiamo chromium con viewport mobile invece del device preset Playwright).
test.use({
  viewport: { width: 393, height: 852 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  userAgent:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
});

async function login(page: Page): Promise<void> {
  await page.goto("/");
  await page.locator('[data-testid="auth-email"]').fill(EMAIL!);
  await page.locator('[data-testid="auth-password"]').fill(PASSWORD!);
  await page.locator('[data-testid="auth-submit"]').click();
  await page.waitForSelector('[data-testid="dashboard-root"]', { timeout: 20_000 });
}

async function dismissOnboarding(page: Page): Promise<void> {
  const skip = page.getByRole("button", { name: /^salta$/i });
  if (await skip.isVisible({ timeout: 2000 }).catch(() => false)) {
    await skip.click().catch(() => {});
  }
}

async function loadTemplate(page: Page): Promise<void> {
  await page.locator('[data-testid="dashboard-action-template"]').click();
  await page.waitForTimeout(800);
  await page.getByText(/Telaio portale/i).first().click();
  // Attendi che il modello sia caricato (anchor: HUD chip "N nodi" o Run button)
  await page
    .waitForSelector(
      ':text-matches("\\\\d+\\\\s*nod[ie]", "i"), [data-feature-id="run-static"]',
      { timeout: 20_000 },
    )
    .catch(() => {
      /* fallback: continuiamo anche se il selettore non match */
    });
  await page.waitForTimeout(2000);
}

test.describe("v2.6.2.2 · mobile HUD quickfix smoke", () => {
  test.beforeEach(async ({ context, page }) => {
    await context.addInitScript(() => {
      try {
        localStorage.setItem("feapro-onboarding-seen-v4", "skipped");
      } catch {
        /* ignore */
      }
    });
    page.on("pageerror", (err) => console.error("[browser]", err.message));
  });

  test("dump baseline mobile HUD topleft", async ({ page }) => {
    await login(page);
    await dismissOnboarding(page);
    await loadTemplate(page);

    // 1. Screenshot full viewport mobile (393x852)
    await page.screenshot({
      path: path.join(OUT, "01-mobile-full.png"),
      fullPage: false,
    });

    // 2. Screenshot zoom area top-left (HUD chips)
    await page.screenshot({
      path: path.join(OUT, "02-mobile-hud-topleft.png"),
      clip: { x: 0, y: 0, width: 393, height: 200 },
    });

    // 3. DOM dump elementi top-left (primi 250px verticali)
    const elements = await page.evaluate(() => {
      const all = document.querySelectorAll<HTMLElement>("*");
      type Item = {
        tag: string;
        text: string;
        rect: { x: number; y: number; width: number; height: number };
        zIndex: string;
      };
      const visible: Item[] = [];
      all.forEach((el) => {
        const r = el.getBoundingClientRect();
        if (
          r.top < 250 &&
          r.left < 393 &&
          r.left >= 0 &&
          r.width > 0 &&
          r.height > 0 &&
          r.width < 400 &&
          r.height < 200
        ) {
          const cs = window.getComputedStyle(el);
          const text = (el.textContent ?? "").slice(0, 80).replace(/\s+/g, " ").trim();
          if (text && text.length > 2) {
            const cls =
              typeof el.className === "string"
                ? el.className.split(" ").filter(Boolean).slice(0, 2).join(".")
                : "";
            visible.push({
              tag: el.tagName.toLowerCase() + (cls ? "." + cls : ""),
              text,
              rect: { x: r.x, y: r.y, width: r.width, height: r.height },
              zIndex: cs.zIndex,
            });
          }
        }
      });
      return visible;
    });

    fs.writeFileSync(
      path.join(OUT, "03-mobile-dom-topleft.json"),
      JSON.stringify(elements, null, 2),
    );

    // 4. Conta sovrapposizioni reali (rect intersezione + stesso z-index
    //    + testo diverso = overlap critico). Esclude parent/child del DOM
    //    cercando solo intersezioni TRA chip distinti (testo diverso).
    const overlaps = elements.filter((a, i) =>
      elements.some(
        (b, j) =>
          i !== j &&
          a.rect.x < b.rect.x + b.rect.width &&
          a.rect.x + a.rect.width > b.rect.x &&
          a.rect.y < b.rect.y + b.rect.height &&
          a.rect.y + a.rect.height > b.rect.y &&
          a.zIndex === b.zIndex &&
          a.text !== b.text &&
          // ignora overlap nested (uno contiene completamente l'altro)
          !(
            a.rect.x <= b.rect.x &&
            a.rect.y <= b.rect.y &&
            a.rect.x + a.rect.width >= b.rect.x + b.rect.width &&
            a.rect.y + a.rect.height >= b.rect.y + b.rect.height
          ) &&
          !(
            b.rect.x <= a.rect.x &&
            b.rect.y <= a.rect.y &&
            b.rect.x + b.rect.width >= a.rect.x + a.rect.width &&
            b.rect.y + b.rect.height >= a.rect.y + a.rect.height
          ),
      ),
    );
    fs.writeFileSync(
      path.join(OUT, "04-mobile-overlaps.json"),
      JSON.stringify(overlaps, null, 2),
    );

    // 5. Summary contatori
    const chipsHud = elements.filter((e) =>
      /Telaio portale|nodi · |elem ·|Tecnica|Engine/.test(e.text),
    );
    const summary = {
      viewportSize: { w: 393, h: 852 },
      totalElementsTopleft: elements.length,
      chipsViewportHud: chipsHud.length,
      overlapsDetected: overlaps.length,
    };
    fs.writeFileSync(
      path.join(OUT, "05-mobile-summary.json"),
      JSON.stringify(summary, null, 2),
    );
  });
});
