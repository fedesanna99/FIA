/**
 * Test ForgotPasswordPage · v2.7.0 Phase 4.1 mockup-driven (F.6.3).
 *
 * 5 test composition + behavior (mock UI D.3=A LOCKED — NO API call):
 *   1. Render iniziale: card-back link + eyebrow + title + form + info-banner
 *   2. Email validation invalida → zod error + no toast emit
 *   3. Submit valid → toast info onesto + success state visible
 *   4. Success state: banner success + link mailto supporto
 *   5. Footer "Torna al login" link → /login
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";


const mockToast = vi.fn();
vi.mock("../../store/toastStore", () => ({
  toast: (...args: unknown[]) => mockToast(...args),
}));


import { ForgotPasswordPage } from "../ForgotPasswordPage";


function renderForgot() {
  return render(
    <MemoryRouter initialEntries={["/forgot-password"]}>
      <Routes>
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/login" element={<div data-testid="login-stub">LOGIN</div>} />
      </Routes>
    </MemoryRouter>,
  );
}


describe("ForgotPasswordPage · F.6 mock UI honest (D.3=A)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("test 1 · render initial form: card-back + eyebrow + title + email field + info banner + submit", () => {
    renderForgot();
    expect(screen.getByTestId("auth-back-link")).toBeInTheDocument();
    expect(screen.getByText("Recupera password")).toBeInTheDocument();
    // Title con line break — match della prima riga
    expect(screen.getByText(/Ti rimandiamo dentro/)).toBeInTheDocument();
    expect(screen.getByTestId("auth-forgot-email")).toBeInTheDocument();
    expect(screen.getByTestId("auth-info-banner")).toBeInTheDocument();
    expect(screen.getByText(/contatta supporto/i)).toBeInTheDocument();
    expect(screen.getByTestId("auth-forgot-submit")).toBeInTheDocument();
  });

  it("test 2 · email validation invalida → zod error e NO toast emit", async () => {
    const user = userEvent.setup();
    renderForgot();
    await user.type(screen.getByTestId("auth-forgot-email"), "non-una-email");
    await user.click(screen.getByTestId("auth-forgot-submit"));
    await waitFor(() =>
      expect(screen.getByText("Inserisci un'email valida")).toBeInTheDocument(),
    );
    expect(mockToast).not.toHaveBeenCalled();
  });

  it("test 3 · submit con email valida → toast info onesto + success state visible", async () => {
    const user = userEvent.setup();
    renderForgot();
    await user.type(screen.getByTestId("auth-forgot-email"), "fede@studio.it");
    await user.click(screen.getByTestId("auth-forgot-submit"));
    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(
        "info",
        expect.stringMatching(/Funzione email recovery in arrivo/),
        expect.any(Number),
      ),
    );
    // Success state: form sostituito da banner con email user
    expect(await screen.findByTestId("auth-forgot-success")).toBeInTheDocument();
    expect(screen.getByTestId("auth-forgot-success-banner")).toBeInTheDocument();
    expect(screen.getByText(/fede@studio.it/)).toBeInTheDocument();
  });

  it("test 4 · success banner contains mailto link to supporto@feapro.dev", async () => {
    const user = userEvent.setup();
    renderForgot();
    await user.type(screen.getByTestId("auth-forgot-email"), "fede@studio.it");
    await user.click(screen.getByTestId("auth-forgot-submit"));
    const supportLink = await screen.findByTestId("auth-forgot-support-link");
    expect(supportLink).toHaveAttribute("href", "mailto:supporto@feapro.dev");
  });

  it("test 5 · footer 'Torna al login' link naviga a /login", async () => {
    const user = userEvent.setup();
    renderForgot();
    const link = screen.getByTestId("auth-forgot-back-to-login");
    expect(link).toHaveAttribute("href", "/login");
    await user.click(link);
    expect(await screen.findByTestId("login-stub")).toBeInTheDocument();
  });
});
