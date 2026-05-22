import { describe, it, expect } from "vitest";
import { translateApiError, translateAxiosError } from "./apiErrors";


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
