/**
 * UI audit screenshots — v1.6.1-polish (UI Gap Analysis sprint).
 *
 * Cattura 42+ screenshot dello stato corrente, organizzati per 3 viewport
 * (desktop 1440x900, tablet 834x1112, mobile 390x844) e 14 schermate.
 *
 * Output in `../docs/ui-gap-analysis/screenshots/`.
 *
 * Eseguire con backend offline (l'audit copre proprio l'empty state).
 *
 *   cd frontend
 *   pnpm exec vite preview --port 5173   # in un terminale
 *   pnpm exec playwright test e2e/ui-audit.spec.ts
 */
import { test, type Page } from "@playwright/test";

const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  tablet: { width: 834, height: 1112 },
  mobile: { width: 390, height: 844 },
};

const OUT = "../docs/ui-gap-analysis/screenshots";

test.describe.configure({ mode: "serial" });

async function loadTemplate(page: Page) {
  await page.goto("/");
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(800);
  // Backend offline = banner visibile, ma il template lo aggiungiamo
  // direttamente nel modelStore via API JS evaluate, cosi' il viewport
  // mostra qualcosa anche senza backend.
  await page.evaluate(() => {
    const ev = new Event("feapro:open-template-gallery");
    window.dispatchEvent(ev);
  });
  await page.waitForTimeout(500);
  const tpl = page.getByText(/Telaio portale 2D/i).first();
  if (await tpl.count()) {
    await tpl.click().catch(() => {});
    await page.waitForTimeout(1800);
  }
}

for (const [device, viewport] of Object.entries(VIEWPORTS)) {
  test.describe(`Audit visivo · ${device}`, () => {
    test.use({ viewport });

    test(`${device} · 01 dashboard empty (no model)`, async ({ page }) => {
      await page.goto("/");
      await page.waitForLoadState("domcontentloaded");
      await page.waitForTimeout(1500);
      await page.screenshot({ path: `${OUT}/${device}-01-dashboard-empty.png`, fullPage: true });
    });

    test(`${device} · 02 dashboard con modello (template caricato)`, async ({ page }) => {
      await loadTemplate(page);
      await page.screenshot({ path: `${OUT}/${device}-02-dashboard-with-model.png`, fullPage: true });
    });

    test(`${device} · 03 Make panel · hub`, async ({ page }) => {
      await loadTemplate(page);
      const rail = page.getByTestId("left-rail-model");
      if (await rail.count() && !(await rail.isDisabled())) {
        await rail.click();
        await page.waitForTimeout(600);
      }
      await page.screenshot({ path: `${OUT}/${device}-03-make-hub.png`, fullPage: true });
    });

    test(`${device} · 04 Make panel · Geometria drill-in`, async ({ page }) => {
      await loadTemplate(page);
      const rail = page.getByTestId("left-rail-model");
      if (await rail.count() && !(await rail.isDisabled())) {
        await rail.click();
        await page.waitForTimeout(400);
        const card = page.getByText(/Geometria/i).first();
        if (await card.count()) await card.click().catch(() => {});
        await page.waitForTimeout(500);
      }
      await page.screenshot({ path: `${OUT}/${device}-04-make-geometria.png`, fullPage: true });
    });

    test(`${device} · 05 Solve panel · hub`, async ({ page }) => {
      await loadTemplate(page);
      const rail = page.getByTestId("left-rail-analysis");
      if (await rail.count() && !(await rail.isDisabled())) {
        await rail.click();
        await page.waitForTimeout(600);
      }
      await page.screenshot({ path: `${OUT}/${device}-05-solve-hub.png`, fullPage: true });
    });

    test(`${device} · 06 Verify panel · hub`, async ({ page }) => {
      await loadTemplate(page);
      const rail = page.getByTestId("left-rail-verify");
      if (await rail.count() && !(await rail.isDisabled())) {
        await rail.click();
        await page.waitForTimeout(600);
      }
      await page.screenshot({ path: `${OUT}/${device}-06-verify-hub.png`, fullPage: true });
    });

    test(`${device} · 07 View panel (RightRail cockpit)`, async ({ page }) => {
      await loadTemplate(page);
      const rail = page.getByTestId("right-rail-view");
      if (await rail.count() && !(await rail.isDisabled())) {
        await rail.click();
        await page.waitForTimeout(600);
      }
      await page.screenshot({ path: `${OUT}/${device}-07-view-panel.png`, fullPage: true });
    });

    test(`${device} · 08 ElementDialog`, async ({ page }) => {
      await loadTemplate(page);
      const b1 = page.getByText(/^B1$/).first();
      if (await b1.count()) {
        await b1.click().catch(() => {});
        await page.waitForTimeout(500);
      }
      await page.screenshot({ path: `${OUT}/${device}-08-element-dialog.png`, fullPage: true });
    });

    test(`${device} · 09 SectionPicker`, async ({ page }) => {
      await loadTemplate(page);
      const b1 = page.getByText(/^B1$/).first();
      if (await b1.count()) {
        await b1.click().catch(() => {});
        await page.waitForTimeout(300);
        const sec = page.getByRole("button", { name: /Cambia.*sezione|Sezione/i }).first();
        if (await sec.count()) {
          await sec.click().catch(() => {});
          await page.waitForTimeout(500);
        }
      }
      await page.screenshot({ path: `${OUT}/${device}-09-section-picker.png`, fullPage: true });
    });

    test(`${device} · 10 Command Palette`, async ({ page }) => {
      await page.goto("/");
      await page.waitForTimeout(500);
      await page.keyboard.press("Control+k");
      await page.waitForTimeout(500);
      await page.screenshot({ path: `${OUT}/${device}-10-palette.png`, fullPage: true });
    });

    test(`${device} · 11 Template Gallery`, async ({ page }) => {
      await page.goto("/");
      await page.waitForTimeout(500);
      // Trigger gallery via custom event (funziona anche backend offline)
      await page.evaluate(() => {
        window.dispatchEvent(new Event("feapro:open-template-gallery"));
      });
      await page.waitForTimeout(600);
      await page.screenshot({ path: `${OUT}/${device}-11-templates.png`, fullPage: true });
    });

    test(`${device} · 12 Onboarding Tour (se attivabile)`, async ({ page }) => {
      await page.addInitScript(() => {
        try {
          localStorage.removeItem("onboarding-store");
          localStorage.removeItem("feapro_onboarding_dismissed");
        } catch { /* ignore */ }
      });
      await page.goto("/");
      await page.waitForTimeout(1200);
      await page.screenshot({ path: `${OUT}/${device}-12-onboarding.png`, fullPage: true });
    });

    test(`${device} · 13 Avatar dropdown`, async ({ page }) => {
      await page.goto("/");
      await page.waitForTimeout(800);
      const av = page.locator('[data-testid="topbar-avatar"]').or(page.getByRole("button", { name: /Avatar|Account/i }));
      if (await av.first().count()) {
        await av.first().click().catch(() => {});
        await page.waitForTimeout(500);
      }
      await page.screenshot({ path: `${OUT}/${device}-13-avatar-menu.png`, fullPage: true });
    });

    test(`${device} · 14 Topbar dettaglio (header only)`, async ({ page }) => {
      await page.goto("/");
      await page.waitForTimeout(800);
      const topbar = page.locator('header').first();
      if (await topbar.count()) {
        await topbar.screenshot({ path: `${OUT}/${device}-14-topbar-detail.png` });
      } else {
        await page.screenshot({ path: `${OUT}/${device}-14-topbar-detail.png`, clip: { x: 0, y: 0, width: viewport.width, height: 60 } });
      }
    });
  });
}
