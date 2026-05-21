/**
 * CommandRegistry (Sprint 5 G8 / alpha.23) — singleton class allineata al
 * brief v1.2.1.
 *
 * Pattern: una sola istanza globale `CommandRegistry`. I componenti
 * `useEffect(() => CommandRegistry.registerAll(...))` registrano voci
 * al mount, ritornano cleanup function per unregister.
 *
 * Fuzzy search via Fuse.js: pesi 2.0 sul name, 1.5 sui keywords, 0.5 sul
 * path, 0.3 sull'id. Threshold 0.4 (medio: tolleranza tipo).
 *
 * API stabile usata da:
 *   - `useCommandRegistry.ts` (hook React)
 *   - `CommandPalette.tsx` (UI consumer)
 *   - Componenti modulari che registrano (builtin.ts, panels.ts, etc.)
 */
import Fuse from "fuse.js";
import type {
  CommandEntry,
  CommandCategory,
  RegistryFilter,
  RegistryResult,
} from "./types";


const CATEGORIES_ORDER: CommandCategory[] = [
  "suggested",
  "action",
  "navigation",
  "tool",
  "setting",
  "model",
  "library",
  "ai",
  "help",
];


class CommandRegistryImpl {
  private entries = new Map<string, CommandEntry>();
  private listeners = new Set<() => void>();
  private fuseInstance: Fuse<CommandEntry> | null = null;
  private fuseDirty = true;

  /** Registra una voce. Ritorna cleanup function per unregister. */
  register(entry: CommandEntry): () => void {
    if (this.entries.has(entry.id)) {
      console.warn(`[CommandRegistry] Duplicate id: ${entry.id}, overwriting`);
    }
    this.entries.set(entry.id, entry);
    this.fuseDirty = true;
    this.emit();
    return () => this.unregister(entry.id);
  }

  /** Registra batch. Utile per modules che spawnano N voci. */
  registerAll(entries: CommandEntry[]): () => void {
    const unregs = entries.map((e) => this.register(e));
    return () => unregs.forEach((fn) => fn());
  }

  unregister(id: string): void {
    if (this.entries.delete(id)) {
      this.fuseDirty = true;
      this.emit();
    }
  }

  /** Tutte le voci enabled. */
  all(): CommandEntry[] {
    return Array.from(this.entries.values()).filter(
      (e) => e.enabled?.() ?? true,
    );
  }

  /** Conta voci totali (anche disabled). */
  size(): number {
    return this.entries.size;
  }

  /** Filtra + raggruppa per categoria. */
  search(filter: RegistryFilter): RegistryResult {
    const { query, categories, maxResults = 100 } = filter;
    let results: CommandEntry[];

    if (!query.trim()) {
      results = this.all();
    } else {
      this.ensureFuse();
      results = this.fuseInstance!.search(query, {
        limit: maxResults * 2,
      }).map((r) => r.item);
    }

    if (categories && categories.length > 0) {
      results = results.filter((e) => categories.includes(e.category));
    }

    const byCategory = {} as Record<CommandCategory, CommandEntry[]>;
    CATEGORIES_ORDER.forEach((c) => (byCategory[c] = []));

    for (const entry of results.slice(0, maxResults)) {
      byCategory[entry.category].push(entry);
    }

    return { byCategory, total: results.length };
  }

  /** Esegue un comando per id. No-op se disabled o non trovato. */
  async execute(id: string): Promise<void> {
    const entry = this.entries.get(id);
    if (!entry) {
      console.warn(`[CommandRegistry] Unknown id: ${id}`);
      return;
    }
    if (entry.enabled && !entry.enabled()) {
      console.warn(`[CommandRegistry] Disabled: ${id}`);
      return;
    }
    await entry.action();
  }

  /** Subscribe alle mutazioni del registry. Ritorna cleanup. */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Resetta il registry (utile in test). */
  clear(): void {
    this.entries.clear();
    this.fuseDirty = true;
    this.emit();
  }

  // ── Internals ─────────────────────────────────────────────────────────────
  private emit(): void {
    this.listeners.forEach((l) => l());
  }

  private ensureFuse(): void {
    if (!this.fuseDirty && this.fuseInstance) return;
    this.fuseInstance = new Fuse(this.all(), {
      keys: [
        { name: "name", weight: 2 },
        { name: "keywords", weight: 1.5 },
        { name: "path", weight: 0.5 },
        { name: "id", weight: 0.3 },
      ],
      threshold: 0.4,
      ignoreLocation: true,
      includeScore: false,
    });
    this.fuseDirty = false;
  }
}


/** Singleton globale del CommandRegistry. */
export const CommandRegistry = new CommandRegistryImpl();
