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


export async function register(
  email: string,
  password: string,
): Promise<AuthResponse> {
  const r = await authClient.post<AuthResponse>("/api/auth/register", {
    email, password,
  });
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
