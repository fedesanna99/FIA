/**
 * Helpers condivisi per quality-checkpoint v2.3.4.
 *
 * Auth-via-API: il backend ha rate-limit assente (audit interno) ma
 * vogliamo comunque evitare 20 signup ridondanti. Riusiamo un user
 * fisso `qa+<random>@feapro.test` per sessione e iniettiamo il JWT
 * direttamente nel localStorage prima del primo `page.goto`.
 */
import { Page, request as pwRequest } from "@playwright/test";

// Default 8765 perché Vite proxy in vite.config.ts attualmente punta lì.
// (Cfr. bug list v2.3.4: vite.config.ts proxy mismatch con docstring playwright.config.ts).
const API_BASE = process.env.E2E_API_BASE ?? "http://localhost:8765";

export interface AuthState {
  token: string;
  email: string;
  userId: string | number;
}

/**
 * Registra (o riusa) un user di test e restituisce token JWT.
 * Idempotente: se l'utente esiste fa login.
 */
export async function getOrCreateTestUser(): Promise<AuthState> {
  // Pydantic email validator rifiuta TLD reserved (.test/.example/.localhost/.invalid)
  // — usiamo un dominio reale ma chiaramente "ours" per riconoscere user QA.
  const email = `qa-v234-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@feapro-qa.com`;
  const password = "QualityCheckpoint2026!";

  const api = await pwRequest.newContext({ baseURL: API_BASE });

  // Try register
  const regRes = await api.post("/api/auth/register", {
    data: { email, password },
  });

  if (regRes.ok()) {
    const body = await regRes.json();
    return { token: body.token, email, userId: body.user?.id ?? "" };
  }

  // 409 → already exists, fallback to login
  if (regRes.status() === 409) {
    const loginRes = await api.post("/api/auth/login", {
      data: { email, password },
    });
    if (loginRes.ok()) {
      const body = await loginRes.json();
      return { token: body.token, email, userId: body.user?.id ?? "" };
    }
    throw new Error(`Login fallback failed: ${loginRes.status()}`);
  }

  throw new Error(`Register failed: ${regRes.status()} ${await regRes.text()}`);
}

/**
 * Inietta JWT nel localStorage del browser PRIMA del primo `goto`.
 * authStore (zustand persist) key: "auth-store"
 * Format: {"state": {"token": "...", "user": {...}}, "version": ...}
 */
export async function seedAuthLocalStorage(page: Page, auth: AuthState): Promise<void> {
  await page.addInitScript(([token, email, userId]) => {
    const payload = {
      state: {
        token,
        user: { id: userId, email, plan: "free", credits: 1000 },
      },
      version: 0,
    };
    window.localStorage.setItem("auth-store", JSON.stringify(payload));
  }, [auth.token, auth.email, String(auth.userId)] as const);
}

/**
 * Authed page fixture: registra + seed localStorage + return page.
 */
export async function authedGoto(page: Page, path: string = "/"): Promise<AuthState> {
  const auth = await getOrCreateTestUser();
  await seedAuthLocalStorage(page, auth);
  await page.goto(path);
  return auth;
}
