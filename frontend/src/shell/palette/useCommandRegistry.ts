/**
 * useCommandRegistry hook (Sprint 5 G8 / alpha.23) — brief v1.2.1.
 *
 * Bridge React → `CommandRegistry` singleton. Esposti due hook:
 *   1. `useCommandSearch(filter)` — subscribe + ri-renderer su mutazioni;
 *      ritorna `RegistryResult` (per la UI palette).
 *   2. `useCommandExecutor()` — handler stabile per execute(id).
 *
 * I componenti che REGISTRANO voci usano direttamente
 * `CommandRegistry.registerAll([...])` in un `useEffect` con cleanup.
 */
import { useCallback, useEffect, useState } from "react";
import { CommandRegistry } from "./CommandRegistry";
import type { RegistryFilter, RegistryResult } from "./types";


/** Subscribe al registry; ricorre il search ad ogni mutazione. */
export function useCommandSearch(filter: RegistryFilter): RegistryResult {
  const [, forceRender] = useState({});
  useEffect(() => CommandRegistry.subscribe(() => forceRender({})), []);
  return CommandRegistry.search(filter);
}


/** Handler stable per execute(id). */
export function useCommandExecutor(): (id: string) => Promise<void> {
  return useCallback((id: string) => CommandRegistry.execute(id), []);
}
