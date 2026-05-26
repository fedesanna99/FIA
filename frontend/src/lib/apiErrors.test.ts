import { describe, it, expect, vi } from "vitest";
import { translateApiError, translateAxiosError, toastApiError } from "./apiErrors";


describe("translateApiError · v1.6 S0 B05", () => {
  it("traduce missing_constraints in italiano", () => {
    const r = translateApiError({ error: "missing_constraints" });
    expect(r.title).toContain("vincolo");
    expect(r.title).toContain("labile");
  });

  it("traduce singular_matrix con consiglio diagnostico", () => {
    const r = translateApiError({ error: "singular_matrix" });
    expect(r.title).toContain("singolare");
    expect(r.title).toContain("moti rigidi");
  });

  it("traduce missing_material includendo element_id", () => {
    const r = translateApiError({ error: "missing_material", element_id: 42 });
    expect(r.title).toContain("materiale");
    expect(r.title).toContain("E42");
  });

  it("traduce missing_section senza element_id usa '?'", () => {
    const r = translateApiError({ error: "missing_section" });
    expect(r.title).toContain("sezione");
    expect(r.title).toContain("E?");
  });

  it("traduce convergence_failed con iteration", () => {
    const r = translateApiError({ error: "convergence_failed", iteration: 50 });
    expect(r.title).toContain("non e' convergito");
    expect(r.title).toContain("50 iterazioni");
  });

  it("traduce convergence_failed senza iteration", () => {
    const r = translateApiError({ error: "convergence_failed" });
    expect(r.title).toContain("non e' convergito");
    expect(r.title).not.toContain("iterazioni");
  });

  it("kind sconosciuto cade su 'Errore del solver'", () => {
    const r = translateApiError({ error: "unknown_kind_xyz" });
    expect(r.title).toBe("Errore del solver");
    expect(r.description).toBe("unknown_kind_xyz");
  });

  it("FastAPI validation error array detail estrae primo msg + path", () => {
    const r = translateApiError({
      detail: [
        { loc: ["body", "n_modes"], msg: "ensure this value is greater than 0", type: "value_error" },
      ],
    });
    expect(r.title).toBe("Dati richiesta non validi");
    expect(r.description).toContain("body.n_modes");
    expect(r.description).toContain("greater than 0");
  });

  it("detail come stringa nuda", () => {
    const r = translateApiError({ detail: "Endpoint non implementato" });
    expect(r.title).toBe("Errore richiesta");
    expect(r.description).toBe("Endpoint non implementato");
  });

  it("Error instance → 'Errore di rete'", () => {
    const r = translateApiError(new TypeError("Network error"));
    expect(r.title).toBe("Errore di rete");
    expect(r.description).toBe("Network error");
  });

  it("stringa nuda", () => {
    const r = translateApiError("server crash");
    expect(r.title).toBe("Errore");
    expect(r.description).toBe("server crash");
  });

  it("null/undefined fallback sicuro (no [object Object])", () => {
    const r = translateApiError(null);
    expect(r.title).toBe("Errore sconosciuto");
    expect(r.description).toBe("—");
  });

  it("oggetto random NON contiene mai [object Object]", () => {
    const r = translateApiError({ foo: "bar", baz: 42 });
    expect(r.title).toBe("Errore sconosciuto");
    expect(r.description).not.toContain("[object Object]");
  });
});


describe("translateAxiosError", () => {
  it("422 con body strutturato → traduce", () => {
    const r = translateAxiosError(422, { error: "missing_constraints" });
    expect(r.title).toContain("vincolo");
  });

  it("500 senza body riconoscibile → prefisso HTTP 500", () => {
    const r = translateAxiosError(500, { something_weird: true });
    expect(r.title).toBe("HTTP 500");
  });

  it("undefined status + body riconosciuto → no prefisso HTTP", () => {
    const r = translateAxiosError(undefined, { error: "no_loads" });
    expect(r.title).not.toMatch(/^HTTP /);
    expect(r.title).toContain("carico");
  });
});


/**
 * Contract test BackendErrorKind ↔ ERROR_TRANSLATIONS (v2.5.1 T6, ARCH-4).
 *
 * Protegge da rimozioni accidentali del mapping italiano per i kind che il
 * frontend si aspetta dal backend. Forma scelta: snapshot frontend (opzione b
 * del brief v2.5.1), perché il backend NON espone un enum `BackendErrorKind`
 * consolidato — i kind sono emessi come stringhe sparse nei body di errore:
 *   - `backend/jobs/worker.py:219`  → "model_not_found"
 *   - `backend/jobs/worker.py:231`  → "solver_not_dispatched" (NON in lista
 *                                      frontend: traduzione mancante, finding
 *                                      aperto da segnalare a parte)
 *   - `backend/billing/middleware.py:27` → "quota_exceeded" (via "code")
 *
 * TODO (v2.5.x roadmap): consolidare un enum runtime `BackendErrorKind` nel
 * backend (es. `backend/core/errors_kinds.py`) e promuovere questo a contract
 * test runtime backend→frontend (opzione a del brief).
 */
const EXPECTED_BACKEND_ERROR_KINDS = [
  "missing_constraints",
  "singular_matrix",
  "missing_material",
  "missing_section",
  "no_loads",
  "invalid_solver_params",
  "convergence_failed",
  "quota_exceeded",
  "model_not_found",
  "validation_failed",
  "solver_not_dispatched",
] as const;

describe("toastApiError · v2.5.5 cluster B (BUG-011+012+013)", () => {
  it("formatta '<action>: <title>' per kind backend riconosciuto", () => {
    const toastMock = vi.fn();
    toastApiError({ error: "missing_constraints" }, "Errore analisi", toastMock);
    expect(toastMock).toHaveBeenCalledTimes(1);
    expect(toastMock).toHaveBeenCalledWith(
      "error",
      expect.stringMatching(/^Errore analisi: .*vincolo/),
    );
  });

  it("axios-like 422 con detail array produce '<action>: <title> · <desc>' (non [object Object])", () => {
    const toastMock = vi.fn();
    toastApiError(
      { detail: [{ loc: ["body", "n_modes"], msg: "must be > 0", type: "value_error" }] },
      "Salvataggio modello",
      toastMock,
    );
    const [level, message] = toastMock.mock.calls[0];
    expect(level).toBe("error");
    expect(message).toMatch(/^Salvataggio modello: Dati richiesta non validi/);
    expect(message).toContain("body.n_modes");
    expect(message).not.toContain("[object Object]");
  });

  it("Error nativo produce '<action>: Errore di rete · <message>' (non [object Error])", () => {
    const toastMock = vi.fn();
    toastApiError(new TypeError("fetch aborted"), "Errore PDF", toastMock);
    const message = toastMock.mock.calls[0][1] as string;
    expect(message).toMatch(/^Errore PDF: Errore di rete/);
    expect(message).toContain("fetch aborted");
    expect(message).not.toContain("[object Error]");
  });

  it("usa toast reale come default toastFn se non specificato", () => {
    // Smoke: chiamata senza throw. Lo store reale riceve il toast e lo cumula
    // nella sua state interna (non verificato per non accoppiarci allo store).
    expect(() => toastApiError({ error: "no_loads" }, "Run analisi")).not.toThrow();
  });
});


describe("contract BackendErrorKind ↔ ERROR_TRANSLATIONS (v2.5.1 T6)", () => {
  it.each(EXPECTED_BACKEND_ERROR_KINDS)(
    "kind '%s' ha traduzione italiana dedicata (no fallback generico)",
    (kind) => {
      const result = translateApiError({ error: kind });
      expect(result.title).not.toBe("Errore del solver");
      expect(result.title.length).toBeGreaterThan(0);
    },
  );
});
