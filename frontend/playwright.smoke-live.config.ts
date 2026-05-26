/**
 * Playwright config override per smoke E2E live (v2.5.0-paolo-ready validation).
 *
 * Punta a https://fea-pro.fly.dev (produzione). NON usare per i test L1/L2
 * existing che assumono localhost:5173. Esecuzione:
 *
 *   FEAPRO_TEST_EMAIL=... FEAPRO_TEST_PASSWORD=... \
 *     pnpm exec playwright test paolo-smoke-live.spec.ts \
 *     --config=playwright.smoke-live.config.ts --reporter=list
 */
import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

export default defineConfig({
  ...base,
  testDir: "./e2e",
  use: {
    ...base.use,
    baseURL: "https://fea-pro.fly.dev",
    trace: "retain-on-failure",
    screenshot: "on",
    video: "retain-on-failure",
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
  },
  timeout: 60_000,
  retries: 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report-smoke-live" }]],
});
