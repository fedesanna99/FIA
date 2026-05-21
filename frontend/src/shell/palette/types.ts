/**
 * CommandRegistry types (Sprint 5 G8 / alpha.23) — schema dal brief v1.2.1.
 *
 * Una `CommandEntry` rappresenta una singola voce indicizzata nella palette
 * Cmd+K. Il `CommandRegistry` aggrega + fuzzy-searcha + esegue.
 */
import type { ComponentType, SVGProps } from "react";


/** Tipo icona Tabler (TablerIconType simplified per evitare import cycle). */
export type TablerIcon = ComponentType<SVGProps<SVGSVGElement> & { size?: number | string }>;


/** Categoria di una voce nella palette (mockup v1.3). */
export type CommandCategory =
  | "suggested"      // contesto-aware, top section
  | "action"         // run, salva, esporta, undo, ecc.
  | "navigation"     // apri pannello/tab
  | "tool"           // strumenti pro
  | "setting"        // ogni toggle/slider/select
  | "model"          // modelli aperti recenti
  | "library"        // materiali, sezioni
  | "help"           // guide, documentazione, shortcut
  | "ai";            // prompt AI suggeriti


/** Voce della palette (entrata indicizzata). */
export interface CommandEntry {
  /** unique, kebab-case (es: "run-static") */
  id: string;
  /** titolo visualizzato (italiano per UX, es: "Run statica lineare") */
  name: string;
  category: CommandCategory;
  /** breadcrumb mostrato sotto il name (es: "Solve · Lineari") */
  path?: string;
  /** componente icona tabler */
  icon?: TablerIcon;
  /** shortcut visualizzato come kbd (es: ["Ctrl", "S"] o ["R"]) */
  shortcut?: string[];
  /** termini di ricerca aggiuntivi (en+it) per fuzzy match */
  keywords?: string[];
  /** azione da eseguire al select (sync o async) */
  action: () => void | Promise<void>;
  /** guard opzionale (es: solo se modello aperto). Default: sempre enabled. */
  enabled?: () => boolean;
  /** badge facoltativo (es: "new", "soon"). */
  badge?: { text: string; tone: "ok" | "warn" | "info" | "coral" | "purple" };
}


/** Filtro per CommandRegistry.search(). */
export interface RegistryFilter {
  /** Query free-text (fuzzy match via Fuse). */
  query: string;
  /** Restringe a sotto-categorie specifiche. */
  categories?: CommandCategory[];
  /** Limita il numero di risultati. */
  maxResults?: number;
}


/** Risultato di un search: voci raggruppate per categoria + count totale. */
export interface RegistryResult {
  byCategory: Record<CommandCategory, CommandEntry[]>;
  total: number;
}
