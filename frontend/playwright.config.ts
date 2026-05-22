/**
 * Playwright config (v1.6.1 T6).
 *
 * Smoke E2E del workflow ingegnere. Headless di default; per visual audit
 * passare `--headed` da CLI.
 *
 * Setup iniziale (una volta sola):
 *   cd frontend
 *   pnpm add -D @playwright/test
 *   pnpm exec playwright install chromium
 *
 * Esecuzione:
 *   pnpm dev        # in un terminale (porta 5173)
 *   pnpm e2e        # in un altro terminale
 */
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:5173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
  ],
});
