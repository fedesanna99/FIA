/**
 * apiErrors (v1.6 Sprint 0 · B05) — traduzione errori HTTP backend → toast IT.
 *
 * Prima: lo screenshot 29 mostrava `HTTP 422: [object Object]` perche'
 * l'interceptor axios faceva interpolazione naif del body errore. Ora
 * `translateApiError` riconosce:
 *
 *   1. body strutturato `{ error: "missing_constraints", ... }` (formato
 *      FastAPI HTTPException(422, {...})) → messaggio italiano umano.
 *   2. FastAPI 422 validation errors `{ detail: [{ loc, msg, type }] }`
 *      → primo messaggio + nome campo.
 *   3. `{ detail: "string" }` → detail come description.
 *   4. Error instance → message + "Errore di rete".
 *   5. fallback → "Errore sconosciuto" + serialize sicuro del payload.
 *
 * Usato dall'interceptor api/client.ts e direttamente dai catch nei
 * componenti (es. hook useRunAnalysis).
 */


/** Forma del body errore strutturato lato backend. */
type BackendErrorKind =
  | "missing_constraints"
  | "singular_matrix"
  | "missing_material"
  | "missing_section"
  | "no_loads"
  | "invalid_solver_params"
  | "convergence_failed"
  | "quota_exceeded"
  | "model_not_found"
  | "validation_failed";


interface BackendErrorBody {
  error?: BackendErrorKind | string;
  detail?: unknown;
  element_id?: number | string;
  iteration?: number;
}


/** Mappa di traduzioni — chiave: `BackendErrorBody.error`. */
const ERROR_TRANSLATIONS: Record<string, (err: BackendErrorBody) => string> = {
  missing_constraints: () =>
    "Aggiungi almeno un vincolo prima di lanciare l'analisi (struttura labile).",
  singular_matrix: () =>
    "La matrice di rigidezza e' singolare. Controlla che i vincoli impediscano i moti rigidi.",
  missing_material: (err) =>
    `Assegna un materiale all'elemento E${err.element_id ?? "?"}.`,
  missing_section: (err) =>
    `Assegna una sezione all'elemento E${err.element_id ?? "?"}.`,
  no_loads: () =>
    "Nessun carico applicato — l'analisi darebbe 0 spostamenti.",
  invalid_solver_params: (err) =>
    `Parametri solver non validi: ${typeof err.detail === "string" ? err.detail : "controlla i valori inseriti"}.`,
  convergence_failed: (err) =>
    `Il solver non e' convergito${err.iteration ? ` dopo ${err.iteration} iterazioni` : ""}. Prova con piu' step o tolleranza piu' alta.`,
  quota_exceeded: () =>
    "Quota crediti esaurita per questo mese. Vai a 'Account → Usage' per dettagli.",
  model_not_found: () =>
    "Modello non trovato. Potrebbe essere stato eliminato in un'altra sessione.",
  validation_failed: () =>
    "Il modello contiene errori di validazione. Apri il pannello 'Tools → Validazione' per dettagli.",
};


export interface TranslatedError {
  title: string;
  description?: string;
}


/**
 * Trasforma un errore di chiamata API in un toast con titolo italiano e
 * descrizione opzionale. Best-effort: se il payload non e' riconosciuto,
 * cade su descrizioni generiche.
 *
 * @param error qualsiasi cosa propagata da axios.catch / fetch.catch —
 *              tipicamente `err.response.data` (body) o `err` stesso.
 */
export function translateApiError(error: unknown): TranslatedError {
  // Caso 1: body strutturato { error: "kind", ... }
  if (isPlainObject(error) && typeof error.error === "string") {
    const be = error as BackendErrorBody;
    const translator = ERROR_TRANSLATIONS[be.error as string];
    if (translator) {
      return { title: translator(be) };
    }
    return {
      title: "Errore del solver",
      description: be.error as string,
    };
  }

  // Caso 2: FastAPI validation error { detail: [{ loc, msg, type }] }
  if (isPlainObject(error) && Array.isArray((error as { detail?: unknown }).detail)) {
    const detailArr = (error as { detail: unknown[] }).detail;
    const first = detailArr[0];
    if (isPlainObject(first) && typeof first.msg === "string") {
      const fieldPath = Array.isArray(first.loc)
        ? first.loc.filter((p) => typeof p === "string" || typeof p === "number").join(".")
        : undefined;
      return {
        title: "Dati richiesta non validi",
        description: fieldPath ? `${fieldPath}: ${first.msg}` : (first.msg as string),
      };
    }
  }

  // Caso 3: { detail: "string" }
  if (isPlainObject(error) && typeof (error as { detail?: unknown }).detail === "string") {
    return {
      title: "Errore richiesta",
      description: (error as { detail: string }).detail,
    };
  }

  // Caso 4: Error instance (network, abort, ecc.)
  if (error instanceof Error) {
    return {
      title: "Errore di rete",
      description: error.message,
    };
  }

  // Caso 5: stringa nuda
  if (typeof error === "string") {
    return { title: "Errore", description: error };
  }

  // Fallback: serialize sicuro
  return {
    title: "Errore sconosciuto",
    description: safeStringify(error),
  };
}


/**
 * Helper alternativo che accetta lo *status code* + payload (lo stile
 * tipico di axios.interceptors.response). Aggiunge il prefisso "HTTP {n}"
 * solo se il payload non e' gia' significativo.
 */
export function translateAxiosError(
  status: number | undefined,
  payload: unknown,
): TranslatedError {
  const translated = translateApiError(payload);
  // Se la traduzione e' generica e abbiamo uno status, includilo per debug.
  if (status && translated.title === "Errore sconosciuto") {
    return { title: `HTTP ${status}`, description: translated.description };
  }
  return translated;
}


function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}


function safeStringify(v: unknown): string {
  try {
    if (v === null || v === undefined) return "—";
    if (typeof v === "object") return JSON.stringify(v, null, 0).slice(0, 200);
    return String(v);
  } catch {
    return "(payload non serializzabile)";
  }
}
