/**
 * Test AuthLayout · v2.7.0 Phase 4.1 mockup-driven (F.3.4).
 *
 * Verifica composition-level del wrapper split-screen e del routing per
 * le 4 pages auth.
 *
 * Coperti:
 *   1. AuthLayout render: BrandAside + Outlet + data-testid auth-shell
 *   2. Route /login → LoginPage stub (con email + password + submit testid
 *      preservati per back-compat smoke E2E v2.6.2/v2.6.6)
 *   3. Route /signup → SignupPage stub
 *   4. Route /forgot-password → ForgotPasswordPage stub
 *   5. Route /verify-email → EmailVerifyPage stub
 *
 * I test usano MemoryRouter per controllare initialEntries.
 */
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { AuthLayout } from "../AuthLayout";
import { EmailVerifyPage } from "../EmailVerifyPage";
import { ForgotPasswordPage } from "../ForgotPasswordPage";
import { LoginPage } from "../LoginPage";
import { SignupPage } from "../SignupPage";


function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/verify-email" element={<EmailVerifyPage />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}


describe("AuthLayout · split-screen + 4-route mounting", () => {
  it("test 1 · AuthLayout renders BrandAside + outlet target on /login", () => {
    renderAt("/login");
    // Wrapper split-screen
    expect(screen.getByTestId("auth-shell")).toBeInTheDocument();
    expect(screen.getByTestId("auth-card-wrap")).toBeInTheDocument();
    // BrandAside montato
    expect(screen.getByTestId("auth-brand-aside")).toBeInTheDocument();
    expect(screen.getByText("FEA Pro")).toBeInTheDocument();
    // Outlet mounta LoginPage
    expect(screen.getByTestId("auth-login-page")).toBeInTheDocument();
  });

  it("test 2 · Route /login mounts LoginPage with auth-email/password/submit testid back-compat", () => {
    renderAt("/login");
    // Backward compat smoke E2E v2.6.2/v2.6.6
    expect(screen.getByTestId("auth-email")).toBeInTheDocument();
    expect(screen.getByTestId("auth-password")).toBeInTheDocument();
    expect(screen.getByTestId("auth-submit")).toBeInTheDocument();
    // Title + eyebrow del mockup
    expect(screen.getByText("Bentornato")).toBeInTheDocument();
    expect(screen.getByText("Accedi al tuo studio")).toBeInTheDocument();
    // Footer link a /signup
    expect(screen.getByTestId("auth-go-signup")).toBeInTheDocument();
  });

  it("test 3 · Route /signup mounts SignupPage stub", () => {
    renderAt("/signup");
    expect(screen.getByTestId("auth-signup-page")).toBeInTheDocument();
    expect(screen.getByText("Inizia in 30 secondi")).toBeInTheDocument();
    expect(screen.getByText("Crea il tuo account")).toBeInTheDocument();
  });

  it("test 4 · Route /forgot-password mounts ForgotPasswordPage stub with back link", () => {
    renderAt("/forgot-password");
    expect(screen.getByTestId("auth-forgot-page")).toBeInTheDocument();
    expect(screen.getByText("Recupera password")).toBeInTheDocument();
    // F.6 refactor: il back link è ora generato da AuthCard `back` prop
    // con data-testid="auth-back-link" (testid `auth-back-to-login` era
    // dello stub F.3, sostituito).
    expect(screen.getByTestId("auth-back-link")).toBeInTheDocument();
  });

  it("test 5 · Route /verify-email mounts EmailVerifyPage stub centered", () => {
    renderAt("/verify-email");
    expect(screen.getByTestId("auth-verify-page")).toBeInTheDocument();
    expect(screen.getByText("Verifica la tua email")).toBeInTheDocument();
    expect(screen.getByText("Quasi pronto")).toBeInTheDocument();
  });
});
