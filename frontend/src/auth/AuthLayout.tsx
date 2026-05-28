/**
 * AuthLayout · v2.7.0 Phase 4.1 mockup-driven (F.3)
 *
 * Wrapper split-screen 50/50 per le 4 auth pages. Sinistra: BrandAside
 * (gradient cyan + manifesto + diagram + stats). Destra: <Outlet />
 * che monta LoginPage / SignupPage / ForgotPasswordPage / EmailVerifyPage
 * a seconda della route.
 *
 * Sorgente: ui_kits/webapp_desktop/Auth.html righe 31 (`<div class="auth-shell">`)
 * + 172 (`<main class="auth-card-wrap">`).
 *
 * NO state-tabs nav in produzione (era demo helper nel mockup HTML —
 * brief decisione 8). Il routing serve già il purpose di switch stato.
 *
 * Importa auth.css per gli stili scoped (`.auth-shell ...`). L'import
 * a livello layout garantisce che il CSS sia caricato per ogni route
 * auth ma NON contaminato sull'app principale (le route `*` non passano
 * mai da AuthLayout).
 */
import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuthStore } from "../store/authStore";

import { BrandAside } from "./BrandAside";
import "../styles/auth.css";

export function AuthLayout() {
  // v3.1.2 audit-fix L1-11: redirect-if-logged-in. Un utente già loggato
  // che digita manualmente `/login`/`/signup`/`/forgot-password` viene
  // rimandato a `/` (o al path originale `state.from`) invece di vedere
  // un form che, su submit, sovrascriverebbe il token corrente. Eccezione:
  // `/verify-email` resta accessibile per visual mockup-testing (vedi
  // EmailVerifyPage docstring).
  const isLoggedIn = useAuthStore((s) => !!s.token && !!s.user);
  const location = useLocation();
  const isVerifyEmail = location.pathname === "/verify-email";
  if (isLoggedIn && !isVerifyEmail) {
    const fallback = (location.state as { from?: string } | null)?.from ?? "/";
    // Sanitize: solo path interni (no `//external`, no protocol).
    const safe = fallback.startsWith("/") && !fallback.startsWith("//") ? fallback : "/";
    return <Navigate to={safe} replace />;
  }
  return (
    <div className="auth-shell" data-testid="auth-shell">
      <BrandAside />
      <main className="auth-card-wrap" data-testid="auth-card-wrap">
        <Outlet />
      </main>
    </div>
  );
}
