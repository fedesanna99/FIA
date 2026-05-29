/**
 * Playwright config (v1.6.1 T6, updated rifinitura 2e per E2E results).
 *
 * Smoke E2E del workflow ingegnere. Headless di default; per visual audit
 * passare `--headed` da CLI.
 *
 * Setup iniziale (una volta sola):
 *   cd frontend
 *   pnpm add -D @playwright/test
 *   pnpm exec playwright install chromium
 *
 * Esecuzione (3 modi, in ordine di comodità):
 *
 *   pnpm e2e                            # autonomo: webServer lancia backend
 *                                       # + frontend, esegue test, e chiude.
 *                                       # CI-friendly.
 *
 *   pnpm dev (in un terminale)          # se vuoi tenere i server up tra
 *   pnpm e2e (in un altro)              # un run e l'altro: reuseExistingServer
 *                                       # true salta il restart.
 *
 *   pnpm e2e results-workspace          # solo i nuovi E2E (suite mirata 2b/2c/2d)
 *
 * Update rifinitura 2e:
 *   - baseURL allineato a 5273 (vite.config.ts), niente piu' mismatch.
 *   - webServer setting: avvio autonomo backend+frontend per CI/local.
 *     reuseExistingServer:!CI consente di sviluppare con dev gia' up.
 */
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? "list" : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:5273",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: [
    {
      // Backend uvicorn (FastAPI). Health endpoint a /api/health.
      command: "uvicorn main:app --host 0.0.0.0 --port 8765",
      cwd: "../backend",
      url: "http://localhost:8765/api/health",
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      stdout: "ignore",
      stderr: "pipe",
    },
    {
      // Frontend Vite dev (porta 5273 da vite.config.ts).
      command: "npm run dev",
      cwd: ".",
      url: "http://localhost:5273",
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      stdout: "ignore",
      stderr: "pipe",
    },
  ],
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
  ],
});
