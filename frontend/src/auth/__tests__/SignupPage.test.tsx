/**
 * Test SignupPage · v2.7.0 Phase 4.1 mockup-driven (F.5.3).
 *
 * Verifica form 6 campi + behavior. Mocking apiRegister + useNavigate
 * + authStore come in LoginPage.test.
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";


// ── Mocks ──────────────────────────────────────────────────────────────────

vi.mock("../../api/auth", () => ({
  register: vi.fn(),
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});


import { register as apiRegister } from "../../api/auth";
import { useAuthStore } from "../../store/authStore";
import { SignupPage } from "../SignupPage";


function renderSignup() {
  return render(
    <MemoryRouter initialEntries={["/signup"]}>
      <Routes>
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/login" element={<div data-testid="login-stub">LOGIN</div>} />
        <Route path="/" element={<div data-testid="home-stub">HOME</div>} />
      </Routes>
    </MemoryRouter>,
  );
}


describe("SignupPage · F.5 completa (mockup-driven)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ token: "", user: null, bootstrapping: false });
  });

  it("test 1 · form 6 campi render (nome + cognome + email + password + ruolo + checkbox + submit)", () => {
    renderSignup();
    expect(screen.getByTestId("auth-signup-nome")).toBeInTheDocument();
    expect(screen.getByTestId("auth-signup-cognome")).toBeInTheDocument();
    expect(screen.getByTestId("auth-signup-email")).toBeInTheDocument();
    expect(screen.getByTestId("auth-signup-password")).toBeInTheDocument();
    expect(screen.getByTestId("auth-signup-ruolo")).toBeInTheDocument();
    expect(screen.getByTestId("auth-signup-accepted-terms")).toBeInTheDocument();
    expect(screen.getByTestId("auth-signup-submit")).toBeInTheDocument();
    expect(screen.getByText("Inizia in 30 secondi")).toBeInTheDocument();
  });

  it("test 2 · PasswordStrengthBars compare appena utente digita password", async () => {
    const user = userEvent.setup();
    renderSignup();
    // Empty password → no PWStrengthBars (conditional render)
    expect(screen.queryByTestId("pw-strength")).not.toBeInTheDocument();
    // Type 1 char → bars appare
    await user.type(screen.getByTestId("auth-signup-password"), "a");
    expect(screen.getByTestId("pw-strength")).toBeInTheDocument();
    expect(screen.getByTestId("pw-strength")).toHaveAttribute("data-strength", "weak");
    // Type a stronger password
    await user.clear(screen.getByTestId("auth-signup-password"));
    await user.type(screen.getByTestId("auth-signup-password"), "Password123!XYZ");
    expect(screen.getByTestId("pw-strength")).toHaveAttribute("data-strength", "strong");
  });

  it("test 3 · submit senza accepted_terms mostra zod error e blocca apiRegister", async () => {
    const user = userEvent.setup();
    renderSignup();
    await user.type(screen.getByTestId("auth-signup-nome"), "Federico");
    await user.type(screen.getByTestId("auth-signup-cognome"), "Sanna");
    await user.type(screen.getByTestId("auth-signup-email"), "fede@studio.it");
    await user.type(screen.getByTestId("auth-signup-password"), "Strong123!");
    await user.selectOptions(screen.getByTestId("auth-signup-ruolo"), "ingegnere");
    // NON clicchiamo il checkbox accepted-terms
    await user.click(screen.getByTestId("auth-signup-submit"));
    await waitFor(() =>
      expect(screen.getByText(/Devi accettare termini/)).toBeInTheDocument(),
    );
    expect(apiRegister).not.toHaveBeenCalled();
  });

  it("test 4 · submit con valid data + accepted_terms chiama apiRegister payload esteso + setAuth + navigate('/')", async () => {
    const user = userEvent.setup();
    const mockUser = {
      id: "u-new",
      email: "fede@studio.it",
      created_at: 1779900000,
      last_login_at: null,
      onboarding_completed: false,
      nome: "Federico",
      cognome: "Sanna",
      ruolo_professionale: "ingegnere" as const,
      terms_accepted_at: 1779900000,
    };
    vi.mocked(apiRegister).mockResolvedValueOnce({
      token: "jwt-new",
      token_type: "Bearer",
      user: mockUser,
    });
    renderSignup();
    await user.type(screen.getByTestId("auth-signup-nome"), "Federico");
    await user.type(screen.getByTestId("auth-signup-cognome"), "Sanna");
    await user.type(screen.getByTestId("auth-signup-email"), "fede@studio.it");
    await user.type(screen.getByTestId("auth-signup-password"), "Strong123!");
    await user.selectOptions(screen.getByTestId("auth-signup-ruolo"), "ingegnere");
    // Click checkbox label wrapper (l'input native è hidden via opacity 0; il
    // click sulla label HTML triggera il toggle del checkbox associato).
    await user.click(screen.getByTestId("auth-signup-accepted-terms"));
    await user.click(screen.getByTestId("auth-signup-submit"));
    await waitFor(() => expect(apiRegister).toHaveBeenCalled());
    expect(vi.mocked(apiRegister).mock.calls[0][0]).toEqual({
      email: "fede@studio.it",
      password: "Strong123!",
      nome: "Federico",
      cognome: "Sanna",
      ruolo_professionale: "ingegnere",
      accepted_terms: true,
    });
    await waitFor(() => expect(useAuthStore.getState().token).toBe("jwt-new"));
    expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true });
  });

  it("test 5 · footer 'Accedi' link naviga a /login", async () => {
    const user = userEvent.setup();
    renderSignup();
    const link = screen.getByTestId("auth-go-login");
    expect(link).toHaveAttribute("href", "/login");
    await user.click(link);
    expect(await screen.findByTestId("login-stub")).toBeInTheDocument();
  });
});
