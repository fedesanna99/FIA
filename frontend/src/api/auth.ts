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
