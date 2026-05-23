/**
 * Visualizzazione finale stato app (v1.9.1).
 *
 * Cattura screenshot diretti dalla produzione live https://fea-pro.fly.dev/
 * in 2 viewport: mobile (iPhone 14 Pro 390×844) + desktop (1440×900).
 *
 *   E2E_BASE_URL=https://fea-pro.fly.dev \
 *     pnpm exec playwright test --config=../.codex-temp/capture.config.ts \
 *     ../.codex-temp/final-state.spec.ts --reporter=line
 */
import { test, type Page } from "@playwright/test";

interface Screen {
  id: string;
  setup: (page: Page) => Promise<void>;
}

const SCREENS: Screen[] = [
  {
    id: "01-home-empty",
    setup: async (page) => {
      await page.goto("/");
      await page.waitForTimeout(2500);
    },
  },
  {
    id: "02-percorsi-wizard-step1",
    setup: async (page) => {
      await page.goto("/");
      await page.waitForTimeout(2500);
      // v1.9.0 T1: CTA Percorsi (emerald) apre il PercorsiBeamWizard 3-step.
      await page.click("[data-testid='home-cta-percorsi']").catch(() => undefined);
      await page.waitForTimeout(600);
    },
  },
  {
    id: "03-percorsi-wizard-step2",
    setup: async (page) => {
      await page.goto("/");
      await page.waitForTimeout(2500);
      await page.click("[data-testid='home-cta-percorsi']").catch(() => undefined);
      await page.waitForTimeout(400);
      // Click sul primo percorso (Trave bi-appoggiata UC1)
      await page
        .click("[data-testid='percorsi-card-trave-bi-appoggiata-uc1']")
        .catch(() => undefined);
      await page.waitForTimeout(400);
    },
  },
];

test.describe.configure({ mode: "serial" });

test.describe("final state · mobile (iPhone 14 Pro)", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  for (const s of SCREENS) {
    test(`mobile · ${s.id}`, async ({ page }) => {
      await page.addInitScript(() => {
        try { localStorage.clear(); } catch { /* ignore */ }
      });
      await s.setup(page);
      await page.screenshot({
        path: `../.codex-temp/final-mobile-${s.id}.png`,
        fullPage: false,
      });
    });
  }
});

test.describe("final state · desktop (1440×900)", () => {
  test.use({ viewport: { width: 1440, height: 900 } });
  for (const s of SCREENS) {
    test(`desktop · ${s.id}`, async ({ page }) => {
      await page.addInitScript(() => {
        try { localStorage.clear(); } catch { /* ignore */ }
      });
      await s.setup(page);
      await page.screenshot({
        path: `../.codex-temp/final-desktop-${s.id}.png`,
        fullPage: false,
      });
    });
  }
});
