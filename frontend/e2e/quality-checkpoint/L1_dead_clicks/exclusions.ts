/**
 * Selettori da SKIPPARE durante il crawler L1.
 *
 * Categorie:
 * - Decorativi puri (anchor "#" ornamentali, sr-only)
 * - Toggle interni il cui effetto è solo `localStorage` o stato store
 *   senza DOM observable change
 * - Skip link (richiedono keyboard nav specifica, falsi positivi su click)
 * - Bottoni che, se cliccati, distruggerebbero lo stato della pagina
 *   (es. logout, delete model) e renderebbero inutile il resto del crawl
 */
// data-testid VALUES o porzioni di selettore da escludere (substring match)
// sul descrittore generato dal crawler.
export const EXCLUDED_SELECTORS = [
  "data-decorative",
  "sr-only",
  "aria-hidden",
  // Skip link a11y (anchor jump, non genera evento osservabile via DOM check)
  "skip-to-content",
  // Logout / sign out — rovinerebbe la sessione di test
  "logout",
  "account-logout",
  // Delete actions — distruttive
  "delete-",
  "remove-",
  // External link (githubsource, fly.dev status)
  'target="_blank"',
];

/**
 * Testi di pulsanti da escludere (case-insensitive, includes-based).
 * Usato come secondo filtro per UI dove i testid mancano.
 */
export const EXCLUDED_TEXT_HINTS = [
  "esci",
  "logout",
  "elimina",
  "rimuovi",
  "cancella",
  "delete",
  "remove",
  "github",
];

export function isExcluded(testid: string, text: string): boolean {
  for (const t of EXCLUDED_TEXT_HINTS) {
    if (text.toLowerCase().includes(t)) return true;
  }
  return false;
}
