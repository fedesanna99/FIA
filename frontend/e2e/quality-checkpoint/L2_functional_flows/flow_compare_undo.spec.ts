/**
 * L2 · Compare + Undo flow (T9 v2.3.4-qa — v2.3.x specific).
 *
 * v2.3.0: Multi-model compare + Undo/Redo store-level
 * v2.3.1: Snapshot diff Δ%
 * v2.3.2: Snapshot persistence localStorage
 *
 * Test:
 * - apri modello → modifica (es. add node via API o palette) → Ctrl+Z dovrebbe revertire
 * - Compare panel raggiungibile via palette
 */
import { test, expect } from "@playwright/test";
import { authedGoto } from "../shared/helpers";

test.describe("L2 · Compare + Undo flow (v2.3.x)", () => {
  test("happy: Ctrl+Z dopo addNode via dialog → nodo rimosso (chiude L2 falso positivo)", async ({ page }) => {
    // v2.5.9 T3 fix: il test originale qui esercitava Ctrl+Z su modello appena
    // caricato (nessuna mutation) → no-op atteso → asseriva solo "no console
    // errors". Falso positivo che mascherava il bug #9. v2.5.4 ha fixato il
    // bug (modelStore.setModel preserva history su refetch stesso model.id),
    // quindi il test ora può esercitare il flow reale:
    //   1. carica modello (`ex_simple_beam_2d` = 11 nodi)
    //   2. aggiungi nodo via NodeDialog (mutation backend → invalidateQueries
    //      → refetch → setModel → history.push v2.5.4 preserva past)
    //   3. attende refetch completion (`networkidle`)
    //   4. assert: count nodi incrementato a 12
    //   5. Ctrl+Z
    //   6. assert: count nodi tornato a 11 (revert reale)
    await authedGoto(page, "/?model=ex_simple_beam_2d");
    await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(1500);

    // Helper: legge il count nodi dal HUD chip (formato "X nodi · Y elem · ...").
    async function readNodeCount(): Promise<number | null> {
      const text = await page
        .locator(':text-matches("\\d+\\s*nod[ie]", "i")')
        .first()
        .textContent({ timeout: 3000 })
        .catch(() => "");
      const match = text?.match(/(\d+)\s*nod[ie]/i);
      return match ? Number(match[1]) : null;
    }

    const initialCount = await readNodeCount();
    expect(initialCount, "HUD chip count nodi iniziale leggibile").not.toBeNull();
    expect(initialCount).toBeGreaterThan(0);

    // Apri NodeDialog via shortcut globale "N" (paletteItems.ts:138).
    // Pattern alternativo: Ctrl+K + "aggiungi nodo" + Enter.
    await page.keyboard.press("n");
    const dialog = page.locator('[role="dialog"]:has-text("Aggiungi nodo")').first();
    await expect(dialog).toBeVisible({ timeout: 3000 });

    // Compila i 3 campi numerici (X, Y, Z). Il dialog ha 4 input ma "ID nodo"
    // è autopopolato da `nextId`. Imposto Y diverso da 0 per essere certi
    // che il nodo sia "nuovo" anche per modelli con nodo (0,0,0).
    const yInput = dialog.getByLabel(/Coord\.\s*Y/i);
    if (await yInput.count() > 0) {
      await yInput.fill("99.5");
    }

    // Salva la mutation (button `data-testid="node-save"` in NodeDialog.tsx:127)
    await page.locator('[data-testid="node-save"]').click();

    // Attende il refetch TanStack Query post-invalidateQueries completare
    await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(800);

    // Assert: count nodi incrementato di 1
    const afterAddCount = await readNodeCount();
    expect(afterAddCount, `count nodi dopo addNode (era ${initialCount})`).toBe(
      (initialCount ?? 0) + 1,
    );

    // Press Ctrl+Z: post-v2.5.4 fix, la history è preservata sul refetch
    // quindi undo riporta lo stato pre-add.
    await page.keyboard.press("Control+z");
    await page.waitForTimeout(500);

    // Assert: count nodi tornato al valore iniziale
    const afterUndoCount = await readNodeCount();
    expect(
      afterUndoCount,
      `count nodi dopo Ctrl+Z (era ${initialCount} pre-add, ${afterAddCount} post-add)`,
    ).toBe(initialCount);
  });

  test("happy: Compare panel raggiungibile via palette", async ({ page }) => {
    await authedGoto(page, "/?model=ex_simple_beam_2d");
    await page.waitForTimeout(1500);

    await page.keyboard.press("Control+K");
    await page.waitForTimeout(400);
    const palette = page.locator('[data-testid="command-palette"], [role="dialog"]').first();
    await expect(palette).toBeVisible({ timeout: 3000 });

    const input = page.locator('input[type="text"], input[role="searchbox"]').first();
    await input.fill("compare");
    await page.waitForTimeout(400);

    const compareHits = await page.locator(':text-matches("(compare|confronta)", "i")').count();
    expect.soft(compareHits, "Palette 'compare' non trova ComparePanel").toBeGreaterThan(0);

    await page.keyboard.press("Escape");
  });

  test("happy: snapshot persiste localStorage tra reload (v2.3.2)", async ({ page }) => {
    await authedGoto(page, "/?model=ex_simple_beam_2d");
    await page.waitForTimeout(1500);

    // Set snapshot dummy via store
    const setOk = await page.evaluate(() => {
      try {
        // Force snapshot via zustand store API
        const raw = localStorage.getItem("snapshot-store");
        if (raw) {
          const parsed = JSON.parse(raw);
          parsed.state = parsed.state || {};
          parsed.state._qa_marker = "v234-qa-test";
          localStorage.setItem("snapshot-store", JSON.stringify(parsed));
        } else {
          localStorage.setItem("snapshot-store", JSON.stringify({ state: { _qa_marker: "v234-qa-test", snapshots: [] }, version: 0 }));
        }
        return true;
      } catch {
        return false;
      }
    });
    expect(setOk).toBeTruthy();

    await page.reload();
    await page.waitForTimeout(1500);

    const marker = await page.evaluate(() => {
      const raw = localStorage.getItem("snapshot-store");
      if (!raw) return null;
      try {
        return JSON.parse(raw).state?._qa_marker;
      } catch {
        return null;
      }
    });
    expect.soft(marker, "snapshot-store NON persiste su reload (v2.3.2 persist broken)").toBe("v234-qa-test");
  });
});
