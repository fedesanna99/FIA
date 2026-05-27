/**
 * Auth API client (alpha.14) — register / login / me endpoints.
 *
 * NB: usa `axios` raw (NON `api` da client.ts) per evitare loop
 * con l'interceptor toast. L'errore lo gestiamo nei mutation.
 */
import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL || "";

export interface AuthUser {
  id: string;
  email: string;
  created_at: number;
  last_login_at: number | null;
  /** v2.6.4 A.2: gate per autoplay del tour onboarding. */
  onboarding_completed: boolean;
  /** v2.7.0 F.5 (D.2=B): metadata signup mockup-driven. Tutti i campi
   *  sono nullable per backward compat con utenti pre-v2.7.0. */
  nome: string | null;
  cognome: string | null;
  ruolo_professionale:
    | "ingegnere"
    | "architetto"
    | "docente"
    | "studente"
    | "altro"
    | null;
  /** Unix timestamp (sec) del consenso a termini e privacy. NULL = utenti
   *  pre-v2.7.0 o chiamate legacy senza accepted_terms. */
  terms_accepted_at: number | null;
}

/** v2.7.0 F.5: payload esteso per POST /api/auth/register. Quando i
 *  campi opzionali sono assenti, il backend mantiene backward compat
 *  (utente creato senza metadata). */
export interface RegisterPayload {
  email: string;
  password: string;
  nome?: string;
  cognome?: string;
  ruolo_professionale?:
    | "ingegnere"
    | "architetto"
    | "docente"
    | "studente"
    | "altro";
  accepted_terms?: boolean;
}

export interface AuthResponse {
  token: string;
  token_type: string;
  user: AuthUser;
}

const authClient = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
});


/**
 * Register nuovo account.
 *
 * v2.7.0 F.5 (D.2=B): firma estesa per signup mockup-driven con metadata.
 *
 * Due overloads:
 *   1. Legacy positional: `register(email, password)` — per backward compat
 *      con AuthScreen/LoginPage stub e ogni codepath pre-v2.7.0.
 *   2. Esteso payload: `register({email, password, nome, cognome,
 *      ruolo_professionale, accepted_terms})` — usato da SignupPage F.5.
 *
 * Quando `accepted_terms === false` esplicito il backend ritorna 422.
 */
export async function register(email: string, password: string): Promise<AuthResponse>;
export async function register(payload: RegisterPayload): Promise<AuthResponse>;
export async function register(
  arg1: string | RegisterPayload,
  password?: string,
): Promise<AuthResponse> {
  const payload: RegisterPayload =
    typeof arg1 === "string" ? { email: arg1, password: password ?? "" } : arg1;
  const r = await authClient.post<AuthResponse>("/api/auth/register", payload);
  return r.data;
}


export async function login(
  email: string,
  password: string,
): Promise<AuthResponse> {
  const r = await authClient.post<AuthResponse>("/api/auth/login", {
    email, password,
  });
  return r.data;
}


/** Verifica un token JWT chiamando /api/auth/me. Solleva su token invalido/expired. */
export async function getMe(token: string): Promise<AuthUser> {
  const r = await authClient.get<{ user: AuthUser }>("/api/auth/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return r.data.user;
}


/**
 * v2.6.4 A.2: aggiorna lo stato onboarding del current user.
 *
 * Consumer:
 *   - `useMarkOnboardingComplete` (lib/onboarding.ts) → completed=true
 *     quando l'utente chiude il tour ([Salta], [Fine], ESC, click backdrop)
 *   - `useResetOnboarding` (lib/onboarding.ts) → completed=false
 *     dal menu Help "Rivedi tour onboarding" per replay
 *
 * Risposta: user aggiornato (con onboarding_completed riflesso).
 */
export async function patchOnboarding(
  token: string,
  completed: boolean,
): Promise<AuthUser> {
  const r = await authClient.patch<{ user: AuthUser }>(
    "/api/auth/onboarding",
    { completed },
    { headers: { Authorization: `Bearer ${token}` } },
  );
  return r.data.user;
}
