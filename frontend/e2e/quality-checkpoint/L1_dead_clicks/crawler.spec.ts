/**
 * L1 · Dead clicks crawler (v2.3.4 quality-checkpoint).
 *
 * Apre ogni schermata raggiungibile (via URL/query) e simula click su
 * ogni elemento interattivo. Verifica effetto osservabile entro 500ms:
 * DOM change, navigation, network, console event, toast, modal apertura.
 *
 * Output: fixtures/<screen>_results.json + log console per aggregazione.
 *
 * Esecuzione:
 *   cd frontend
 *   ./node_modules/.bin/playwright test e2e/quality-checkpoint/L1_dead_clicks/ --reporter=list
 */
import { test, expect, Page } from "@playwright/test";
import { authedGoto } from "../shared/helpers";
import { EXCLUDED_SELECTORS, isExcluded } from "./exclusions";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

// ESM equivalent of __dirname (playwright runs in ESM by default qui)
const __filename_local = fileURLToPath(import.meta.url);
const __dirname_local = path.dirname(__filename_local);

interface ClickResult {
  selector: string;
  text: string;
  url: string;
  status: "alive" | "dead" | "error" | "skipped";
  evidence?: string;
}

const SCREENS_TO_VISIT = [
  { url: "/", name: "home_empty" },
  { url: "/?model=ex_simple_beam_2d", name: "beam_loaded" },
  { url: "/?model=ex_portal_frame_2d", name: "portal_loaded" },
  { url: "/?model=ex_truss_3d", name: "truss3d_loaded" },
];

const MAX_CLICKS_PER_SCREEN = 80; // safety upper bound

async function buildClickableSelector(): Promise<string> {
  return [
    "button:not([disabled])",
    '[role="button"]:not([aria-disabled="true"])',
    "a[href]",
    '[tabindex]:not([tabindex="-1"])',
  ].join(", ");
}

async function describeElement(el: import("@playwright/test").Locator): Promise<{
  selector: string;
  text: string;
}> {
  const text = ((await el.textContent()) ?? "").trim().substring(0, 60);
  const testid = (await el.getAttribute("data-testid")) ?? "";
  const ariaLabel = (await el.getAttribute("aria-label")) ?? "";
  const tag = await el.evaluate((n) => (n as Element).tagName.toLowerCase());

  let selector: string;
  if (testid) {
    selector = `[data-testid="${testid}"]`;
  } else if (ariaLabel) {
    selector = `${tag}[aria-label="${ariaLabel}"]`;
  } else {
    selector = tag + (text ? `:text("${text.substring(0, 30)}")` : "");
  }

  return { selector, text };
}

async function collectClickableDescriptors(page: Page): Promise<{ selector: string; text: string }[]> {
  const clickableSelector = await buildClickableSelector();
  const seen = new Set<string>();
  const out: { selector: string; text: string }[] = [];

  const all = await page.locator(clickableSelector).all();
  for (const el of all) {
    try {
      if (!(await el.isVisible())) continue;
      const desc = await describeElement(el);
      const key = `${desc.selector}|${desc.text}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(desc);
    } catch {
      // detached → ignore
    }
  }
  return out;
}

async function crawlScreen(page: Page, screenName: string): Promise<ClickResult[]> {
  const results: ClickResult[] = [];

  // Phase 1: collect descriptor snapshot (testid + text), don't keep locators
  const descriptors = await collectClickableDescriptors(page);
  console.log(`  [${screenName}] discovered ${descriptors.length} clickable elements`);

  let processed = 0;
  for (const descriptor of descriptors) {
    if (processed >= MAX_CLICKS_PER_SCREEN) {
      console.log(`  [${screenName}] truncated at ${MAX_CLICKS_PER_SCREEN} clicks`);
      break;
    }
    processed++;

    // Exclusions (selector substring match)
    if (EXCLUDED_SELECTORS.some((s) => descriptor.selector.includes(s))) {
      results.push({ ...descriptor, url: page.url(), status: "skipped", evidence: "matched EXCLUDED_SELECTORS" });
      continue;
    }
    if (isExcluded(descriptor.selector, descriptor.text)) {
      results.push({ ...descriptor, url: page.url(), status: "skipped", evidence: "matched EXCLUDED_TEXT_HINTS" });
      continue;
    }

    // Re-find element fresh
    const el = page.locator(descriptor.selector).first();
    try {
      if (!(await el.isVisible({ timeout: 500 }))) {
        results.push({ ...descriptor, url: page.url(), status: "skipped", evidence: "element no longer visible" });
        continue;
      }
    } catch {
      results.push({ ...descriptor, url: page.url(), status: "skipped", evidence: "element detached" });
      continue;
    }

    // Pre-click snapshot (allargato a tutti i pattern di overlay/floating UI)
    const urlBefore = page.url();
    const overlaySelector = '[role="dialog"], [role="menu"], [role="listbox"], [role="tooltip"], [data-state="open"]';
    const overlayBefore = await page.locator(overlaySelector).count();
    const toastBefore = await page.locator('[data-toast], [data-testid="toast"], [role="status"], [data-sonner-toast]').count();
    const focusBefore = await page.evaluate(() => document.activeElement?.tagName + "#" + (document.activeElement?.id || ""));
    // Hash leggero del body per detectare qualsiasi DOM mutation
    const bodyHashBefore = await page.evaluate(() => {
      let h = 0;
      const s = (document.body.innerHTML || "").substring(0, 50000);
      for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
      return h;
    });

    const consoleErrBefore: string[] = [];
    const consoleHandler = (msg: import("@playwright/test").ConsoleMessage) => {
      if (msg.type() === "error" || msg.type() === "warning") {
        consoleErrBefore.push(`[${msg.type()}] ${msg.text().substring(0, 200)}`);
      }
    };
    page.on("console", consoleHandler);
    let networkFired = false;
    const requestHandler = () => {
      networkFired = true;
    };
    page.on("request", requestHandler);

    try {
      // force: true → bypass actionability checks (overlay/cover false positives)
      // — accettiamo che "non cliccabile per overlay" diventi un'osservazione,
      // non un dead click. La definizione operativa del brief richiede solo
      // che il click sia DISPATCHATO e si verifichi effetto.
      await el.click({ timeout: 1500, force: true, trial: false });
      await page.waitForTimeout(500);

      const urlAfter = page.url();
      const overlayAfter = await page.locator(overlaySelector).count();
      const toastAfter = await page.locator('[data-toast], [data-testid="toast"], [role="status"], [data-sonner-toast]').count();
      const focusAfter = await page.evaluate(() => document.activeElement?.tagName + "#" + (document.activeElement?.id || ""));
      const bodyHashAfter = await page.evaluate(() => {
        let h = 0;
        const s = (document.body.innerHTML || "").substring(0, 50000);
        for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
        return h;
      });

      const observable: string[] = [];
      if (urlAfter !== urlBefore) observable.push(`url:${urlBefore.split("/").pop()}->${urlAfter.split("/").pop()}`);
      if (overlayAfter !== overlayBefore) observable.push(`overlay:${overlayBefore}->${overlayAfter}`);
      if (toastAfter !== toastBefore) observable.push(`toast:${toastBefore}->${toastAfter}`);
      if (focusAfter !== focusBefore) observable.push(`focus:${focusBefore}->${focusAfter}`);
      if (bodyHashAfter !== bodyHashBefore) observable.push("dom:mutated");
      if (networkFired) observable.push("network:fired");
      if (consoleErrBefore.length > 0) observable.push(`console:${consoleErrBefore.length}msg`);

      const isAlive = observable.length > 0;
      results.push({
        ...descriptor,
        url: urlBefore,
        status: isAlive ? "alive" : "dead",
        evidence: isAlive ? observable.join(", ") : "no observable effect within 500ms",
      });

      // Close any opened overlay so subsequent clicks work
      if (overlayAfter > overlayBefore) {
        await page.keyboard.press("Escape").catch(() => {});
        await page.waitForTimeout(250);
        // If still open, click backdrop top-left
        if ((await page.locator(overlaySelector).count()) > overlayBefore) {
          await page.mouse.click(5, 5).catch(() => {});
          await page.waitForTimeout(250);
        }
      }
      // If URL navigated away, go back to screen
      if (urlAfter !== urlBefore) {
        await page.goto(urlBefore, { timeout: 5000 }).catch(() => {});
        await page.waitForTimeout(300);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      results.push({
        ...descriptor,
        url: urlBefore,
        status: "error",
        evidence: message.substring(0, 200),
      });
    } finally {
      page.off("request", requestHandler);
      page.off("console", consoleHandler);
    }
  }

  return results;
}

test.describe("L1 · Dead clicks crawler", () => {
  test.setTimeout(180_000); // crawl per screen può richiedere min

  for (const screen of SCREENS_TO_VISIT) {
    test(`crawl ${screen.name}`, async ({ page }) => {
      // Auth-aware: pre-iniettiamo JWT così la AuthGate non blocca
      await authedGoto(page, screen.url);
      await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(800); // settle animazioni

      const results = await crawlScreen(page, screen.name);

      const alive = results.filter((r) => r.status === "alive").length;
      const dead = results.filter((r) => r.status === "dead");
      const errors = results.filter((r) => r.status === "error");
      const skipped = results.filter((r) => r.status === "skipped").length;

      console.log(`\n=== Screen: ${screen.name} ===`);
      console.log(`  Total examined: ${results.length}`);
      console.log(`  ✓ Alive:        ${alive}`);
      console.log(`  ✗ Dead:         ${dead.length}`);
      console.log(`  ⚠ Errors:       ${errors.length}`);
      console.log(`  ⊘ Skipped:      ${skipped}`);

      if (dead.length > 0) {
        console.log(`\n  DEAD elements:`);
        for (const d of dead) {
          console.log(`    - "${d.text}" (${d.selector})`);
          console.log(`      evidence: ${d.evidence}`);
        }
      }

      // Persist results
      const outFile = path.join(__dirname_local, "fixtures", `${screen.name}_results.json`);
      fs.mkdirSync(path.dirname(outFile), { recursive: true });
      fs.writeFileSync(
        outFile,
        JSON.stringify(
          { screen: screen.name, url: screen.url, total: results.length, alive, dead: dead.length, errors: errors.length, skipped, results },
          null,
          2,
        ),
      );

      // Soft expect — test fallisce ma continua
      expect.soft(dead, `Dead clicks su ${screen.name}: ${dead.length}`).toHaveLength(0);
    });
  }
});
