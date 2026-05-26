/**
 * Smoke E2E composition · v2.6.6-home-legacy-shell-refactor (E.5).
 *
 * 5 test composition-level che verificano la home dashboard A1 mockup nel
 * chrome legacy (stato `activeId === null`, useNewShell === false):
 *
 *   1. LeftRail expanded con 4 sezioni testuali + 12 voci + toggle Comprimi
 *   2. Click guard SOLVE/VERIFY senza modello → toast con CTA "Apri galleria
 *      template" → dialog galleria template visible
 *   3. Sezione "Modelli recenti" sempre visibile (empty state OR cards,
 *      variante resiliente per CI)
 *   4. Topbar legacy eyebrow `WORKSPACE` + crediti inline
 *   5. Statusbar legacy enriched (Online · WebSocket · Sync · counter ·
 *      crediti · ⌘K · version)
 *
 * Lezione da v2.6.5: smoke E2E base 3 test verificava solo caricamento
 * pagina. Questi 5 test composition-level prevengono regressioni nel
 * gap chiuso da v2.6.6 (chrome legacy refactor).
 *
 * Credenziali via env vars FEAPRO_TEST_EMAIL / FEAPRO_TEST_PASSWORD.
 * baseURL: localhost:5173 (default) o E2E_BASE_URL / PLAYWRIGHT_BASE_URL.
 */
import { test, expect, Page } from "@playwright/test";

const EMAIL = process.env.FEAPRO_TEST_EMAIL;
const PASSWORD = process.env.FEAPRO_TEST_PASSWORD;

if (!EMAIL || !PASSWORD) {
  throw new Error(
    "FEAPRO_TEST_EMAIL e FEAPRO_TEST_PASSWORD non settate. Setta env vars locali per smoke E2E.",
  );
}

/**
 * Login + dismiss onboarding. Lascia l'utente nella home dashboard
 * (activeId === null) — NON carica nessun template.
 */
async function loginToHomeDashboard(page: Page): Promise<void> {
  await page.goto("/");
  await page.locator('[data-testid="auth-email"]').fill(EMAIL!);
  await page.locator('[data-testid="auth-password"]').fill(PASSWORD!);
  await page.locator('[data-testid="auth-submit"]').click();
  await page.waitForSelector('[data-testid="dashboard-root"]', { timeout: 20_000 });

  // Dismiss OnboardingTour (welcome modal) se appare
  const skipButton = page.getByRole("button", { name: /^salta$/i });
  if (await skipButton.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await skipButton.click();
    await skipButton.waitFor({ state: "hidden", timeout: 5_000 }).catch(() => {});
  }
}

test.describe("v2.6.6 home dashboard composition (A1 mockup)", () => {
  // Forza desktop viewport (mobile force-collapses la rail → test fallirebbero).
  // Decisione PM E.5 punto C: NO scope mobile in v2.6.6.
  test.use({ viewport: { width: 1440, height: 900 } });

  test.beforeEach(async ({ context, page }) => {
    // Cleanup localStorage isolation (decisione PM E.5 punto B):
    // feapro:rail:expanded resettato → default expanded=true per first-access.
    // Anche dismiss onboarding pre-set.
    await context.addInitScript(() => {
      try {
        localStorage.removeItem("feapro:rail:expanded");
        localStorage.setItem("feapro-onboarding-seen-v4", "skipped");
      } catch {
        /* incognito quota strict — best-effort */
      }
    });
    page.on("pageerror", (err) => console.error("[browser error]", err.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") console.error("[browser console error]", msg.text());
    });
  });

  test("test 1 · LeftRail expanded with 4 text sections and 12 items", async ({ page }) => {
    await loginToHomeDashboard(page);

    // Verifica wrapper rail (RailSections shared component nel chrome legacy
    // ha className "shell-rail legacy-left-rail"). Cerchiamo via data-shell
    // perché il className combinato non è data-testid in se. RailSections
    // setta data-shell="rail" + data-expanded="true".
    const rail = page.locator('nav[data-shell="rail"][data-expanded="true"]').first();
    await expect(rail).toBeVisible();

    // 4 sezioni testuali eyebrow (LOCKED order: WORKSPACE / SOLVE / VERIFY / RISORSE)
    await expect(page.getByTestId("rail-section-WORKSPACE")).toBeVisible();
    await expect(page.getByTestId("rail-section-SOLVE")).toBeVisible();
    await expect(page.getByTestId("rail-section-VERIFY")).toBeVisible();
    await expect(page.getByTestId("rail-section-RISORSE")).toBeVisible();

    // Sample 4 voci chiave (una per sezione)
    await expect(page.getByTestId("rail-item-home")).toBeVisible();
    await expect(page.getByTestId("rail-item-models")).toBeVisible();
    await expect(page.getByTestId("rail-item-linear")).toBeVisible();
    await expect(page.getByTestId("rail-item-templates")).toBeVisible();

    // Verifica count totale: deve essere esattamente 12 voci nella rail
    // (scoping al parent nav per evitare collisioni con altri rail-item-*
    // eventualmente presenti nel DOM — non dovrebbero, ma defense in depth).
    const itemCount = await rail.locator('[data-testid^="rail-item-"]').count();
    expect(itemCount).toBe(12);

    // Toggle Comprimi
    await expect(page.getByTestId("rail-collapse-toggle")).toBeVisible();
  });

  test("test 2 · Click rail-item-linear without model shows toast + CTA opens template gallery", async ({ page }) => {
    await loginToHomeDashboard(page);

    // Stato Nessun modello attivo (login porta a dashboard, no template caricato)
    await page.getByTestId("rail-item-linear").click();

    // Toast info appare (role="status" da Toaster.tsx) con il testo educational
    const toast = page.locator('[role="status"]').filter({ hasText: /Carica un modello/i });
    await expect(toast).toBeVisible({ timeout: 5_000 });

    // CTA "Apri galleria template" presente
    const cta = toast.locator("button", { hasText: /Apri galleria template/i });
    await expect(cta).toBeVisible();

    // Click sulla CTA → dialog galleria template visible (TemplateGalleryDialog
    // ha data-testid="template-gallery" + title "Galleria template")
    await cta.click();
    await expect(page.getByTestId("template-gallery")).toBeVisible({ timeout: 5_000 });
  });

  test("test 3 · Recent models section visible (empty state OR cards, resilient)", async ({ page }) => {
    await loginToHomeDashboard(page);

    // Variante RESILIENTE (decisione PM E.5 punto A): accetta entrambi i casi.
    // - utente vergine (0 modelli user-created) → empty state visibile con 2 CTA
    // - utente con modelli salvati (es. test Federico in deploy live) → cards
    // Test resiliente perché Playwright in CI può vedere stato diverso da
    // sviluppo locale a seconda dell'account FEAPRO_TEST_EMAIL.

    // Caso A · empty state
    const emptySection = page.getByTestId("recent-models-empty");
    const emptyVisible = await emptySection.isVisible({ timeout: 5_000 }).catch(() => false);

    // Caso B · grid populated
    const gridSection = page.getByTestId("recent-models-grid");
    const gridVisible = await gridSection.isVisible({ timeout: 1_000 }).catch(() => false);

    // Almeno uno dei due deve essere visibile
    expect(emptyVisible || gridVisible).toBe(true);

    if (emptyVisible) {
      // Verifica 2 CTA empty state
      await expect(page.getByTestId("recent-empty-cta-templates")).toBeVisible();
      await expect(page.getByTestId("recent-empty-cta-new")).toBeVisible();
      // Title "Modelli recenti" sempre presente
      await expect(emptySection.getByText("Modelli recenti")).toBeVisible();
    } else if (gridVisible) {
      // Almeno 1 card user-model
      const cardCount = await gridSection.locator("[data-testid^='recent-model-']").count();
      expect(cardCount).toBeGreaterThan(0);
      // Title "Modelli recenti" + "Vedi tutti"
      await expect(gridSection.getByText("Modelli recenti")).toBeVisible();
      await expect(page.getByTestId("recent-models-see-all")).toBeVisible();
    }
  });

  test("test 4 · Topbar legacy eyebrow WORKSPACE + crediti inline", async ({ page }) => {
    await loginToHomeDashboard(page);

    const topbar = page.getByTestId("topbar-legacy");
    await expect(topbar).toBeVisible();

    // Eyebrow WORKSPACE (font mono uppercase) — prima del brand mark
    const eyebrow = page.getByTestId("topbar-eyebrow");
    await expect(eyebrow).toBeVisible();
    await expect(eyebrow).toHaveText("WORKSPACE");

    // Crediti inline pattern `{used}/{cap} cr`
    const credits = page.getByTestId("topbar-credits");
    await expect(credits).toBeVisible();
    await expect(credits).toContainText(/cr/i);
    await expect(credits).toContainText(/\d+\/\d+/);
  });

  test("test 5 · Statusbar legacy enriched (WebSocket + Sync + counter + credits + ⌘K + version)", async ({ page }) => {
    await loginToHomeDashboard(page);

    const statusbar = page.getByTestId("statusbar-legacy");
    await expect(statusbar).toBeVisible();

    // WebSocket connected (deploy live ha backend health=ok → "WebSocket connesso")
    const ws = page.getByTestId("sb-ws");
    await expect(ws).toBeVisible();
    await expect(ws).toContainText(/WebSocket/i);

    // Sync OK chip
    const sync = page.getByTestId("sb-sync");
    await expect(sync).toBeVisible();
    await expect(sync).toContainText(/Sync/i);

    // Counter modelli aperti (0 o 1)
    const counter = page.getByTestId("sb-models-open");
    await expect(counter).toBeVisible();
    await expect(counter).toContainText(/modelli aperti/i);

    // Crediti inline pattern
    const credits = page.getByTestId("sb-credits");
    await expect(credits).toBeVisible();
    await expect(credits).toContainText(/cr/i);

    // ⌘K Cerca shortcut hint
    await expect(statusbar.getByText("⌘K")).toBeVisible();
    await expect(statusbar.getByText("Cerca")).toBeVisible();

    // Version marker (es. v2.6) presente nella statusbar (ultima entry)
    await expect(statusbar).toContainText(/v2\.\d+/);
  });
});
