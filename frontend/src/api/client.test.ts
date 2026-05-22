/**
 * client interceptor tests (v1.6.1 T1 · BUG-1).
 *
 * Verifica che l'interceptor axios:
 *  - non emetta toast su network error puro (backend down)
 *  - rispetti la whitelist di endpoint di boot (auth/me, jobs, billing/quota,
 *    materials, sections, accelerograms, quotas)
 *  - emetta toast italiani su 4xx/5xx di chiamate POST/utente (es. 422 analisi)
 *  - non emetta toast su 401 di /api/auth/me (login flow gestisce la UI)
 *
 * Tecnica: l'interceptor axios e' registrato come secondo handler della
 * response chain. Lo invochiamo direttamente via `handlers[0].rejected(err)`
 * (axios espone l'array internamente). Cosi' evitiamo di mockare axios o di
 * fare richieste HTTP reali, e testiamo la logica deterministica.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { api } from "./client";

vi.mock("../store/toastStore", () => ({
  toast: vi.fn(),
}));

import { toast } from "../store/toastStore";

interface InterceptorManager {
  handlers: Array<{
    rejected?: (err: unknown) => unknown;
  } | null>;
}

function rejectVia(err: unknown) {
  // axios: `api.interceptors.response` espone `handlers` come property non
  // tipata. Accediamo via cast controllato.
  const mgr = api.interceptors.response as unknown as InterceptorManager;
  const handler = mgr.handlers.find((h) => h && typeof h.rejected === "function");
  if (!handler?.rejected) {
    throw new Error("Interceptor handler.rejected not found");
  }
  return handler.rejected(err);
}

describe("api/client interceptor (v1.6.1 T1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("nessun toast su network error puro (backend down, err.response undefined)", async () => {
    const netErr = {
      config: { url: "/api/models/", method: "get" },
      // crucial: NO `response` field
    };

    await expect(rejectVia(netErr)).rejects.toBeDefined();
    expect(toast).not.toHaveBeenCalled();
  });

  it("nessun toast su 401 GET /api/auth/me (whitelist boot)", async () => {
    const err401 = {
      config: { url: "/api/auth/me", method: "get" },
      response: { status: 401, data: { detail: "Token invalid" } },
    };

    await expect(rejectVia(err401)).rejects.toBeDefined();
    expect(toast).not.toHaveBeenCalled();
  });

  it("nessun toast su 500 GET /api/jobs/abc (whitelist polling job)", async () => {
    const err500 = {
      config: { url: "/api/jobs/abc-123", method: "get" },
      response: { status: 500, data: { detail: "Internal" } },
    };

    await expect(rejectVia(err500)).rejects.toBeDefined();
    expect(toast).not.toHaveBeenCalled();
  });

  it("nessun toast su 503 GET /api/billing/quota/anon (whitelist quota boot)", async () => {
    const err503 = {
      config: { url: "/api/billing/quota/anon", method: "get" },
      response: { status: 503, data: { detail: "Service Unavailable" } },
    };

    await expect(rejectVia(err503)).rejects.toBeDefined();
    expect(toast).not.toHaveBeenCalled();
  });

  it("emette toast con messaggio italiano su POST 422 missing_constraints", async () => {
    const err422 = {
      config: { url: "/api/analysis/static/abc", method: "post" },
      response: {
        status: 422,
        data: { error: "missing_constraints" },
      },
    };

    await expect(rejectVia(err422)).rejects.toBeDefined();
    expect(toast).toHaveBeenCalledTimes(1);
    const [level, message] = (toast as ReturnType<typeof vi.fn>).mock.calls[0] as [string, string];
    expect(level).toBe("error");
    // Il messaggio italiano contiene la parola "vincolo".
    expect(message.toLowerCase()).toContain("vincolo");
    // Nessun [object Object].
    expect(message).not.toContain("[object Object]");
  });
});
