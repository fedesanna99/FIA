/**
 * Test LoginPage · v2.7.0 Phase 4.1 mockup-driven (F.4.3).
 *
 * Verifica composition + comportamento di LoginPage completa (post F.4
 * refactor da stub funzionale F.3).
 *
 * 8 test (brief stima): form fields render, email validation, password
 * show/hide toggle, "Dimenticata?" + "Creane uno gratuito" link, submit
 * con valid data → authStore.setAuth + navigate, submit con backend error
 * → error visualizzato, SSO buttons render + onClick → toast info.
 *
 * Mock strategy:
 *   - `api/auth` mockato (login restituisce token+user fittizi)
 *   - `authStore` setAuth spiato per assert
 *   - `react-router-dom` useNavigate spiato per assert redirect
 *   - `toastStore` toast spiato per assert SSO toast
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";


// ── Mocks ──────────────────────────────────────────────────────────────────

vi.mock("../../api/auth", () => ({
  login: vi.fn(),
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockToast = vi.fn();
vi.mock("../../store/toastStore", () => ({
  toast: (...args: unknown[]) => mockToast(...args),
  // Re-export anything else the LoginPage chain might pull (none necessary).
}));


// Import AFTER vi.mock so the mocked modules are picked up.
import { login as apiLogin } from "../../api/auth";
import { useAuthStore } from "../../store/authStore";
import { LoginPage } from "../LoginPage";


function renderLogin() {
  return render(
    <MemoryRouter initialEntries={["/login"]}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<div data-testid="signup-stub">SIGNUP</div>} />
        <Route path="/forgot-password" element={<div data-testid="forgot-stub">FORGOT</div>} />
        <Route path="/" element={<div data-testid="home-stub">HOME</div>} />
      </Routes>
    </MemoryRouter>,
  );
}


describe("LoginPage · F.4 completa (mockup-driven)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset authStore between tests so setAuth assertions are isolated.
    useAuthStore.setState({ token: "", user: null, bootstrapping: false });
  });

  it("test 1 · form fields render (email + password + show-toggle + stay-logged + submit)", () => {
    renderLogin();
    expect(screen.getByTestId("auth-email")).toBeInTheDocument();
    expect(screen.getByTestId("auth-password")).toBeInTheDocument();
    expect(screen.getByTestId("auth-show-pwd-toggle")).toBeInTheDocument();
    expect(screen.getByTestId("auth-stay-logged")).toBeInTheDocument();
    expect(screen.getByTestId("auth-submit")).toBeInTheDocument();
    expect(screen.getByText("Entra in FEA Pro")).toBeInTheDocument();
  });

  it("test 2 · email validation mostra errore zod su submit con email malformata", async () => {
    const user = userEvent.setup();
    renderLogin();
    await user.type(screen.getByTestId("auth-email"), "non-una-email");
    await user.type(screen.getByTestId("auth-password"), "anything");
    await user.click(screen.getByTestId("auth-submit"));
    await waitFor(() => expect(screen.getByText("Email non valida")).toBeInTheDocument());
    expect(apiLogin).not.toHaveBeenCalled();
  });

  it("test 3 · password show/hide toggle commuta type input + aria-label", async () => {
    const user = userEvent.setup();
    renderLogin();
    const pwd = screen.getByTestId("auth-password");
    expect(pwd).toHaveAttribute("type", "password");
    const toggle = screen.getByTestId("auth-show-pwd-toggle");
    expect(toggle).toHaveAttribute("aria-label", "Mostra password");
    await user.click(toggle);
    expect(pwd).toHaveAttribute("type", "text");
    expect(toggle).toHaveAttribute("aria-label", "Nascondi password");
    await user.click(toggle);
    expect(pwd).toHaveAttribute("type", "password");
  });

  it("test 4 · 'Dimenticata?' field-aside punta a /forgot-password", async () => {
    const user = userEvent.setup();
    renderLogin();
    const aside = screen.getByTestId("auth-field-aside");
    expect(aside).toHaveAttribute("href", "/forgot-password");
    expect(aside).toHaveTextContent("Dimenticata?");
    await user.click(aside);
    expect(await screen.findByTestId("forgot-stub")).toBeInTheDocument();
  });

  it("test 5 · footer 'Creane uno gratuito' link naviga a /signup", async () => {
    const user = userEvent.setup();
    renderLogin();
    const link = screen.getByTestId("auth-go-signup");
    expect(link).toHaveAttribute("href", "/signup");
    await user.click(link);
    expect(await screen.findByTestId("signup-stub")).toBeInTheDocument();
  });

  it("test 6 · submit con valid data chiama apiLogin + setAuth + navigate('/')", async () => {
    const user = userEvent.setup();
    const mockUser = {
      id: "u-42",
      email: "fede@studio.it",
      created_at: 1748800000,
      last_login_at: null,
      onboarding_completed: false,
      nome: null,
      cognome: null,
      ruolo_professionale: null,
      terms_accepted_at: null,
    };
    vi.mocked(apiLogin).mockResolvedValueOnce({
      token: "jwt-token",
      token_type: "Bearer",
      user: mockUser,
    });
    renderLogin();
    await user.type(screen.getByTestId("auth-email"), "fede@studio.it");
    await user.type(screen.getByTestId("auth-password"), "passw0rd!");
    await user.click(screen.getByTestId("auth-submit"));
    await waitFor(() => expect(apiLogin).toHaveBeenCalledWith("fede@studio.it", "passw0rd!"));
    await waitFor(() => expect(useAuthStore.getState().token).toBe("jwt-token"));
    expect(useAuthStore.getState().user).toEqual(mockUser);
    expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true });
  });

  it("test 7 · submit con backend error 401 mostra messaggio italiano umano", async () => {
    const user = userEvent.setup();
    const httpErr = {
      response: { data: { detail: "Invalid email or password" } },
    };
    vi.mocked(apiLogin).mockRejectedValueOnce(httpErr);
    renderLogin();
    await user.type(screen.getByTestId("auth-email"), "fede@studio.it");
    await user.type(screen.getByTestId("auth-password"), "wrongpass");
    await user.click(screen.getByTestId("auth-submit"));
    await waitFor(() => expect(screen.getByTestId("auth-error")).toBeInTheDocument());
    expect(screen.getByTestId("auth-error")).toHaveTextContent("Email o password non validi.");
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("test 8 · SSO Google + GitHub buttons render e onClick → toast info 'in arrivo'", async () => {
    const user = userEvent.setup();
    renderLogin();
    const google = screen.getByTestId("auth-sso-google");
    const github = screen.getByTestId("auth-sso-github");
    expect(google).toHaveTextContent("Continua con Google");
    expect(github).toHaveTextContent("Continua con GitHub");
    await user.click(google);
    expect(mockToast).toHaveBeenCalledWith("info", expect.stringMatching(/SSO Google in arrivo/));
    await user.click(github);
    expect(mockToast).toHaveBeenCalledWith("info", expect.stringMatching(/SSO GitHub in arrivo/));
  });
});
