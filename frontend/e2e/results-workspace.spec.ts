/**
 * results-workspace.spec.ts
 * redesign/workspace-fasi · rifinitura 2e (E2E suite).
 *
 * 6 test E2E MIRATI per i flussi critici delle fette 2b/2c/2d. Sono test
 * "anti-regressione di cose già pagate" — non una coverage matrix sparsa.
 *
 *   TEST 1 — CTA toast cambia phase a Risultati  → anti HMR-stale
 *   TEST 2 — niente toast se già su Risultati    → gate workspace silenzioso
 *   TEST 3 — toast TTL ~10s autodismiss          → rispetto utente che ignora
 *   TEST 4 — badge affidabilità beam vs cubo H8  → Validato vs Stima (FAM B)
 *   TEST 5 — Δ equilibrio neutro su distribuiti  → anti-falsa-rossa (Fix B 2d)
 *   TEST 6 — Export CSV → toast info (non alert) → anti-silent-click (Fix A 2d)
 *
 * Pre-condizioni:
 *   - backend e frontend autostartati da playwright.config webServer
 *   - template `ex_simple_beam_2d` e `ex_cube_solid_h8` disponibili nel backend
 *
 * Idempotenza:
 *   - ogni test crea un proprio modello da template (clone) → no state condiviso
 *   - user QA creato al volo (timestamp + random nel email)
 *   - sessionStorage settato via addInitScript PRIMA del primo goto, niente race
 */
import { test, expect, type Page, request as pwRequest } from "@playwright/test";

const API_BASE = process.env.E2E_API_BASE ?? "http://localhost:8765";

// ─── Auth + clonatore template ──────────────────────────────────────────

interface AuthState { token: string; userId: string; email: string }

async function getOrCreateTestUser(): Promise<AuthState> {
  const email = `qa-e2e-2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@feapro-qa.com`;
  const password = "Rifinitura2e!";
  const api = await pwRequest.newContext({ baseURL: API_BASE });
  const reg = await api.post("/api/auth/register", { data: { email, password } });
  if (reg.ok()) {
    const body = await reg.json();
    return { token: body.token, userId: String(body.user?.id ?? ""), email };
  }
  throw new Error(`Register failed: ${reg.status()} ${await reg.text()}`);
}

async function cloneTemplate(token: string, templateId: string): Promise<string> {
  const api = await pwRequest.newContext({ baseURL: API_BASE });
  const res = await api.post(`/api/models/from-template/${templateId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok()) {
    throw new Error(`Clone template ${templateId} failed: ${res.status()} ${await res.text()}`);
  }
  const body = await res.json();
  return body.id;
}

/**
 * Seeda authStore + sessionStorage (activeId + workspace) PRIMA del primo goto.
 * Apre la pagina e aspetta che la Shell custom sia montata.
 */
async function openModelInShell(
  page: Page,
  auth: AuthState,
  modelId: string,
  workspace: "modello" | "analisi" | "risultati",
): Promise<void> {
  await page.addInitScript(([token, userId, email, id, ws]) => {
    window.localStorage.setItem("auth-store", JSON.stringify({
      state: { token, user: { id: userId, email, plan: "free", credits: 1000 } },
      version: 0,
    }));
    window.sessionStorage.setItem("feapro:active-model-id", id);
    window.sessionStorage.setItem("feapro:shell:active-workspace", ws);
  }, [auth.token, auth.userId, auth.email, modelId, workspace] as const);

  await page.goto("/");
  // Shell custom è montata (FETTA 0/1/2): data-shell="topbar" attributo stabile
  await page.locator('[data-shell="topbar"]').waitFor({ timeout: 20_000 });
  // Spina 3 fasi presente (FETTA 1)
  await page.locator('[data-testid="phase-step-build"]').waitFor({ timeout: 5_000 });
}

/**
 * Click Esegui in topbar + attesa response API. Più affidabile di sleep.
 */
async function runAnalysisAndWait(page: Page): Promise<void> {
  const respPromise = page.waitForResponse(
    (r) => /\/api\/analysis\/(static|modal|dynamic)\//.test(r.url()) && r.status() === 200,
    { timeout: 30_000 },
  );
  await page.locator('[data-testid="topbar-run"]').click();
  await respPromise;
  // Lascia un tick perché useAnalysis propaghi setStatic + showAnalysisCompleteToast
  await page.waitForTimeout(150);
}

// ─── I 6 TEST ───────────────────────────────────────────────────────────

test.describe("Results workspace · 2b/2c/2d E2E suite", () => {

  // TEST 1 — anti HMR-stale: il bug che ci è costato un giorno intero ─────
  test("TEST 1 — CTA toast cambia phase a Risultati (anti-HMR-stale)", async ({ page }) => {
    const auth = await getOrCreateTestUser();
    const modelId = await cloneTemplate(auth.token, "ex_simple_beam_2d");
    await openModelInShell(page, auth, modelId, "modello");

    // Pre-condizione: siamo sul passo Costruisci
    await expect(page.locator('[data-testid="phase-step-build"]')).toHaveClass(/is-active/);

    // Click Esegui (bottone topbar; NON F5 keyboard che farebbe refresh)
    await runAnalysisAndWait(page);

    // Il toast deve apparire (con CTA "Vai ai Risultati →")
    const toast = page.locator('[data-testid="analysis-complete-toast"]');
    await expect(toast).toBeVisible({ timeout: 5_000 });

    // Click sulla CTA — è qui che il bug HMR rompeva tutto
    await page.locator('[data-testid="analysis-complete-goto"]').click();

    // Atteso #1: sessionStorage scritto entro 1s
    await expect
      .poll(
        () => page.evaluate(() => sessionStorage.getItem("feapro:shell:active-workspace")),
        { timeout: 2_000 },
      )
      .toBe("risultati");

    // Atteso #2: la pillola Risultati è is-active e calcolo fresco
    const resultsStep = page.locator('[data-testid="phase-step-results"]');
    await expect(resultsStep).toHaveClass(/is-active/);
    await expect(resultsStep).toHaveAttribute("data-state", "done");

    // Atteso #3: il panel destro mostra le 3 tab (Sintesi/Dati/Verifiche)
    await expect(page.locator('[data-testid="results-tab-sintesi"]')).toBeVisible();
    await expect(page.locator('[data-testid="results-tab-dati"]')).toBeVisible();
    await expect(page.locator('[data-testid="results-tab-verifiche"]')).toBeVisible();
  });

  // TEST 2 — utente già su Risultati: niente toast, dati aggiornati silente ─
  test("TEST 2 — niente toast se già su Risultati (silent update)", async ({ page }) => {
    const auth = await getOrCreateTestUser();
    const modelId = await cloneTemplate(auth.token, "ex_simple_beam_2d");
    await openModelInShell(page, auth, modelId, "risultati");

    // Pre: σ MAX è "—" perché nessun calcolo ancora
    const sigma = page.locator('[data-testid="verdict-cell-sigma"]');
    await expect(sigma).toHaveText("—", { timeout: 5_000 });

    await runAnalysisAndWait(page);

    // Atteso #1: nessun toast appare (gate workspace="risultati")
    const toast = page.locator('[data-testid="analysis-complete-toast"]');
    await expect(toast).toHaveCount(0, { timeout: 3_000 });

    // Atteso #2: σ MAX è stato aggiornato (non più "—")
    await expect.poll(
      async () => (await sigma.textContent())?.trim() ?? "",
      { timeout: 5_000 },
    ).not.toBe("—");
  });

  // TEST 3 — utente ignora il toast: TTL 10s autodismiss ─────────────────
  test("TEST 3 — toast scompare da solo dopo TTL (~10s autodismiss)", async ({ page }) => {
    const auth = await getOrCreateTestUser();
    const modelId = await cloneTemplate(auth.token, "ex_simple_beam_2d");
    await openModelInShell(page, auth, modelId, "modello");

    await runAnalysisAndWait(page);

    const toast = page.locator('[data-testid="analysis-complete-toast"]');
    await expect(toast).toBeVisible({ timeout: 5_000 });

    // Aspetta ~12s (TTL 10000ms + buffer setTimeout) senza cliccare nulla
    await page.waitForTimeout(12_000);

    // Toast scomparso, l'utente è rimasto su Costruisci
    await expect(toast).toHaveCount(0);
    await expect(page.locator('[data-testid="phase-step-build"]')).toHaveClass(/is-active/);
  });

  // TEST 4 — contrasto Validato (beam) vs Stima (cubo H8) ─────────────────
  test("TEST 4 — badge affidabilità: Validato (beam) vs Stima (cubo H8)", async ({ page }) => {
    const auth = await getOrCreateTestUser();

    // CASO A: trave → tone "validated"
    const beamId = await cloneTemplate(auth.token, "ex_simple_beam_2d");
    await openModelInShell(page, auth, beamId, "risultati");
    await runAnalysisAndWait(page);
    // Sintesi è il tab di default in Risultati, ma cliccarlo è idempotente
    await page.locator('[data-testid="results-tab-sintesi"]').click();
    const trustBeam = page.locator('[data-testid="sintesi-trust-badge"]');
    await expect(trustBeam).toHaveAttribute("data-tone", "validated");
    await expect(trustBeam).toContainText("Validato");

    // CASO B: cubo H8 → tone "estimate"
    const cubeId = await cloneTemplate(auth.token, "ex_cube_solid_h8");
    await openModelInShell(page, auth, cubeId, "risultati");
    await runAnalysisAndWait(page);
    await page.locator('[data-testid="results-tab-sintesi"]').click();
    const trustCube = page.locator('[data-testid="sintesi-trust-badge"]');
    await expect(trustCube).toHaveAttribute("data-tone", "estimate");
    await expect(trustCube).toContainText("Stima");
  });

  // TEST 5 — Fix B 2d: equilibrio neutro su distribuiti, NO ✗ ─────────────
  test("TEST 5 — Δ equilibrio neutro su distribuiti (anti-falsa-rossa, Fix B)", async ({ page }) => {
    const auth = await getOrCreateTestUser();
    // ex_simple_beam_2d ha carico distribuito qy=-10 kN/m
    const modelId = await cloneTemplate(auth.token, "ex_simple_beam_2d");
    await openModelInShell(page, auth, modelId, "risultati");
    await runAnalysisAndWait(page);

    // Vai a Dati > Reazioni
    await page.locator('[data-testid="results-tab-dati"]').click();
    await page.locator('[data-testid="results-subtab-reazioni"]').click();

    const delta = page.locator('[data-testid="reazioni-sum-delta"]');
    await expect(delta).toBeVisible({ timeout: 5_000 });

    // Atteso: tone "info" (neutro grigio), NON "warn" (ambra)
    await expect(delta).toHaveAttribute("data-tone", "info");
    // Atteso: testo informativo che parla di distribuiti esclusi
    await expect(delta).toContainText(/distribuit/i);
    // Atteso: NESSUN "✗" che farebbe pensare a un errore
    await expect(delta).not.toContainText("✗");
  });

  // TEST 6 — Fix A 2d: export CSV mostra toast info, non window.alert ─────
  test("TEST 6 — Export CSV mostra toast info (anti-silent-click, Fix A)", async ({ page }) => {
    const auth = await getOrCreateTestUser();
    const modelId = await cloneTemplate(auth.token, "ex_simple_beam_2d");
    await openModelInShell(page, auth, modelId, "risultati");
    await runAnalysisAndWait(page);

    // Sniffer: se qualcuno (regressione futura) reintroduce window.alert,
    // il dialog event qui sotto va a true e fallisce il test.
    let alertWasShown = false;
    page.on("dialog", async (dialog) => {
      alertWasShown = true;
      await dialog.dismiss().catch(() => undefined);
    });

    // Vai a Dati > Sollecitazioni
    await page.locator('[data-testid="results-tab-dati"]').click();
    await page.locator('[data-testid="results-subtab-sollecitazioni"]').click();

    // Click sul bottone CSV
    await page.locator('[data-testid="sollec-export-csv"]').click();

    // Atteso #1: un toast contenente "Esportazione CSV" e "in arrivo"
    const toastMessage = page.getByText(/Esportazione CSV.*in arrivo/i);
    await expect(toastMessage).toBeVisible({ timeout: 3_000 });

    // Atteso #2: NESSUN dialog nativo (window.alert) è stato aperto
    expect(alertWasShown).toBe(false);
  });
});
