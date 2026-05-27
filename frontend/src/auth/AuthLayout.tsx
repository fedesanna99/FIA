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
import { Outlet } from "react-router-dom";

import { BrandAside } from "./BrandAside";
import "../styles/auth.css";

export function AuthLayout() {
  return (
    <div className="auth-shell" data-testid="auth-shell">
      <BrandAside />
      <main className="auth-card-wrap" data-testid="auth-card-wrap">
        <Outlet />
      </main>
    </div>
  );
}
