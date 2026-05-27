/**
 * Smoke E2E composition · v2.7.0-auth-mockup-driven (F.8).
 *
 * 8 test Playwright composition-level che verificano la pagina Auth
 * mockup-driven (Phase 4.1, 4 stati LOGIN/SIGNUP/FORGOT/VERIFY).
 *
 * Reference mockup autoritativo: ui_kits/webapp_desktop/Auth.html del pack
 * Claude Design handoff v0.3 aggiornato (committato in
 * docs/design_handoff/FEA_Pro_Design_System-handoff_aggiornato.zip).
 *
 * Decisioni LOCKED brief Federico v2.7.0:
 *   D.1=A React Router 4 route URL-based (/login /signup /forgot-password
 *         /verify-email)
 *   D.4=A Verify mock UI — accessibile via URL diretto, NO flow signup
 *
 * Lezione cumulativa v2.6.x: smoke E2E PASS non equivale a "100% reale".
 * Lo smoke visivo manuale checklist 46/46 (T_last.6) resta OBBLIGATORIO
 * prima di dichiarare il brief chiuso.
 *
 * NO env vars necessarie: gli auth state sono accessibili senza
 * autenticazione (sono le pagine di entry per utenti unauthenticated).
 * Cleanup cookies + localStorage all'inizio per garantire stato pulito.
 *
 * baseURL: localhost:5173 (default) o E2E_BASE_URL / PLAYWRIGHT_BASE_URL.
 */
import { test, expect, type Page } from "@playwright/test";


/**
 * Cleanup di cookie + localStorage prima di navigare a /login.
 * Garantisce che non ci sia un token persistito da run precedenti.
 */
async function startFreshAt(page: Page, path: string): Promise<void> {
  await page.context().clearCookies();
  await page.addInitScript(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      /* incognito quota strict — best-effort */
    }
  });
  await page.goto(path);
}


test.describe("v2.7.0 auth composition (mockup-driven Phase 4.1)", () => {
  // Desktop viewport per default; il responsive test override.
  test.use({ viewport: { width: 1280, height: 720 } });

  test.beforeEach(async ({ page }) => {
    page.on("pageerror", (err) => console.error("[browser error]", err.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") console.error("[browser console error]", msg.text());
    });
  });

  test("test 1 · Login state · split-screen + brand + card composition", async ({ page }) => {
    await startFreshAt(page, "/login");

    // Wrapper split-screen
    await expect(page.getByTestId("auth-shell")).toBeVisible();
    await expect(page.getByTestId("auth-card-wrap")).toBeVisible();

    // Left aside · brand
    const aside = page.getByTestId("auth-brand-aside");
    await expect(aside).toBeVisible();
    await expect(aside.getByText("FEA Pro", { exact: true })).toBeVisible();
    await expect(aside.getByText("FEM Web Studio")).toBeVisible();
    // Manifesto + brand-claim 4-line bold (algoritmo, onestà)
    await expect(aside.getByText("Manifesto · v2.3.7")).toBeVisible();
    await expect(aside.getByText("algoritmo", { exact: true })).toBeVisible();
    await expect(aside.getByText("onestà", { exact: true })).toBeVisible();
    // Brand-diagram SVG con linearGradient stress
    await expect(aside.locator("svg").first()).toBeVisible();
    // Brand stats 62 / 5 / 1244
    const stats = page.getByTestId("brand-stats");
    await expect(stats).toBeVisible();
    await expect(stats.getByText("62")).toBeVisible();
    await expect(stats.getByText("1244")).toBeVisible();
    await expect(stats.getByText("endpoint REST")).toBeVisible();

    // Right card · login
    const card = page.getByTestId("auth-login-page");
    await expect(card).toBeVisible();
    await expect(card.getByText("Bentornato", { exact: true })).toBeVisible();
    await expect(card.getByText("Accedi al tuo studio")).toBeVisible();
    await expect(page.getByTestId("auth-email")).toBeVisible();
    await expect(page.getByTestId("auth-password")).toBeVisible();
    await expect(page.getByTestId("auth-submit")).toBeVisible();
    await expect(page.getByText("Entra in FEA Pro")).toBeVisible();
  });

  test("test 2 · Login → forgot navigation via Dimenticata? aside", async ({ page }) => {
    await startFreshAt(page, "/login");
    await page.getByTestId("auth-field-aside").click();
    await expect(page).toHaveURL(/forgot-password/);
    await expect(page.getByTestId("auth-forgot-page")).toBeVisible();
    await expect(page.getByText("Recupera password")).toBeVisible();
  });

  test("test 3 · Login → signup navigation via footer link", async ({ page }) => {
    await startFreshAt(page, "/login");
    await page.getByTestId("auth-go-signup").click();
    await expect(page).toHaveURL(/signup/);
    await expect(page.getByTestId("auth-signup-page")).toBeVisible();
    await expect(page.getByText("Inizia in 30 secondi")).toBeVisible();
  });

  test("test 4 · Signup form · 6 fields + password strength reattiva + checkbox", async ({ page }) => {
    await startFreshAt(page, "/signup");

    // 6 form fields (5 collected + checkbox accepted-terms)
    await expect(page.getByTestId("auth-signup-nome")).toBeVisible();
    await expect(page.getByTestId("auth-signup-cognome")).toBeVisible();
    await expect(page.getByTestId("auth-signup-email")).toBeVisible();
    await expect(page.getByTestId("auth-signup-password")).toBeVisible();
    await expect(page.getByTestId("auth-signup-ruolo")).toBeVisible();
    await expect(page.getByTestId("auth-signup-accepted-terms")).toBeVisible();
    await expect(page.getByTestId("auth-signup-submit")).toBeVisible();

    // Password strength reattiva (compute live durante typing)
    const pwdInput = page.getByTestId("auth-signup-password");
    await pwdInput.fill("abc");
    await expect(page.getByTestId("pw-strength")).toHaveAttribute("data-strength", "weak");
    await pwdInput.fill("Password123!XYZ");
    await expect(page.getByTestId("pw-strength")).toHaveAttribute("data-strength", "strong");
  });

  test("test 5 · Show/hide password toggle commuta type input", async ({ page }) => {
    await startFreshAt(page, "/login");
    const pwdInput = page.getByTestId("auth-password");
    await expect(pwdInput).toHaveAttribute("type", "password");
    const toggle = page.getByTestId("auth-show-pwd-toggle");
    await toggle.click();
    await expect(pwdInput).toHaveAttribute("type", "text");
    await toggle.click();
    await expect(pwdInput).toHaveAttribute("type", "password");
  });

  test("test 6 · Forgot password · info banner + email autofocus + supporto link", async ({ page }) => {
    await startFreshAt(page, "/forgot-password");
    await expect(page.getByText(/Ti rimandiamo dentro/)).toBeVisible();
    // Email field autofocus
    const emailField = page.getByTestId("auth-forgot-email");
    await expect(emailField).toBeFocused();
    // Info banner con link supporto
    await expect(page.getByTestId("auth-info-banner")).toBeVisible();
    await expect(page.getByText(/contatta supporto/i)).toBeVisible();
    const supportLink = page.getByTestId("auth-forgot-support-banner-link");
    await expect(supportLink).toHaveAttribute("href", "mailto:supporto@feapro.dev");
  });

  test("test 7 · Email verify · OTP 6 cells auto-advance + resend countdown initial", async ({ page }) => {
    await startFreshAt(page, "/verify-email");
    await expect(page.getByText("Verifica la tua email")).toBeVisible();
    await expect(page.getByText("Quasi pronto")).toBeVisible();

    const cells = page.locator('[data-testid^="auth-otp-cell-"]');
    await expect(cells).toHaveCount(6);

    // Auto-advance: type "8" in cell 0 → focus cell 1
    await cells.nth(0).click();
    await cells.nth(0).fill("8");
    await expect(cells.nth(1)).toBeFocused();

    // Resend countdown visible con timer initial format M:SS
    await expect(page.getByTestId("auth-verify-resend-timer")).toBeVisible();
    await expect(page.getByTestId("auth-verify-resend-timer")).toHaveText(/in [01]:[0-5][0-9]/);

    // Submit disabled finché OTP < 6
    await expect(page.getByTestId("auth-verify-submit")).toBeDisabled();
  });

  test("test 8 · Responsive · single column layout ≤ 980px viewport", async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 600 });
    await startFreshAt(page, "/login");

    const aside = page.getByTestId("auth-brand-aside");
    const cardWrap = page.getByTestId("auth-card-wrap");
    await expect(aside).toBeVisible();
    await expect(cardWrap).toBeVisible();

    // Verifica stacked layout: aside.bottom <= cardWrap.top + tolerance
    // (CSS grid-template-columns: 1fr → stack verticale)
    const asideBox = await aside.boundingBox();
    const cardBox = await cardWrap.boundingBox();
    expect(asideBox).not.toBeNull();
    expect(cardBox).not.toBeNull();
    if (asideBox && cardBox) {
      expect(asideBox.y).toBeLessThan(cardBox.y);
    }
  });
});
