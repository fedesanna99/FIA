/**
 * Test EmailVerifyPage · v2.7.0 Phase 4.1 mockup-driven (F.7.3).
 *
 * 6 test composition + behavior (mock UI D.4=A LOCKED):
 *   1. Render iniziale: verify-icon + eyebrow + title + OTP 6 cells +
 *      submit disabled + resend disabled con countdown initial 1:00
 *   2. Email da query param ?email=… rendered in sub
 *   3. Submit OTP < 6 char → button disabled (no click action)
 *   4. Submit OTP = 6 char → toast success + navigate('/')
 *   5. Countdown decrement con fakeTimers; arriva a 0 → resend enabled
 *   6. Footer "Ricrea l'account" → /signup
 */
import { render, screen, act, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";


const mockToast = vi.fn();
vi.mock("../../store/toastStore", () => ({
  toast: (...args: unknown[]) => mockToast(...args),
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});


import { EmailVerifyPage } from "../EmailVerifyPage";


function renderVerify(initialPath = "/verify-email") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/verify-email" element={<EmailVerifyPage />} />
        <Route path="/signup" element={<div data-testid="signup-stub">SIGNUP</div>} />
        <Route path="/" element={<div data-testid="home-stub">HOME</div>} />
      </Routes>
    </MemoryRouter>,
  );
}


describe("EmailVerifyPage · F.7 mock UI honest (D.4=A)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("test 1 · render initial: verify-icon + eyebrow + 6 OTP cells + submit disabled + countdown initial", () => {
    renderVerify();
    // Eyebrow + title
    expect(screen.getByText("Quasi pronto")).toBeInTheDocument();
    expect(screen.getByText("Verifica la tua email")).toBeInTheDocument();
    // OTP cells = 6
    expect(screen.getAllByTestId(/^auth-otp-cell-/)).toHaveLength(6);
    // Submit button disabled (no OTP digits entered)
    const submit = screen.getByTestId("auth-verify-submit");
    expect(submit).toBeDisabled();
    // Resend button disabled (countdown attivo)
    expect(screen.getByTestId("auth-verify-resend-btn")).toBeDisabled();
    // Timer mostra format M:SS — atteso "1:00" o "0:59" subito dopo mount
    expect(screen.getByTestId("auth-verify-resend-timer")).toHaveTextContent(
      /in [01]:[0-5][0-9]/,
    );
  });

  it("test 2 · email da query param ?email=… rendered in sub bold", () => {
    renderVerify("/verify-email?email=fede%40studio.it");
    expect(screen.getByText("fede@studio.it")).toBeInTheDocument();
  });

  it("test 3 · OTP < 6 char → submit disabled (no click action)", async () => {
    const user = userEvent.setup();
    renderVerify();
    const cells = screen.getAllByTestId(/^auth-otp-cell-/);
    await user.click(cells[0]);
    await user.keyboard("123");
    // OTP = "123" (3 char) — submit ancora disabled
    expect(screen.getByTestId("auth-verify-submit")).toBeDisabled();
    // Anche con 5 char
    await user.keyboard("45");
    expect(screen.getByTestId("auth-verify-submit")).toBeDisabled();
  });

  it("test 4 · OTP 6 char → submit enabled, click → toast success + navigate('/')", async () => {
    const user = userEvent.setup();
    renderVerify();
    const cells = screen.getAllByTestId(/^auth-otp-cell-/);
    await user.click(cells[0]);
    await user.keyboard("824173");
    expect(screen.getByTestId("auth-verify-submit")).toBeEnabled();
    await user.click(screen.getByTestId("auth-verify-submit"));
    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(
        "success",
        expect.stringMatching(/Email verificata.*mock/),
        expect.any(Number),
      ),
    );
    expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true });
  });

  it("test 5 · countdown decrement via fakeTimers; arriva a 0 → resend enabled", () => {
    vi.useFakeTimers();
    try {
      renderVerify();
      // Initial countdown "1:00"
      expect(screen.getByTestId("auth-verify-resend-timer")).toHaveTextContent("in 1:00");
      expect(screen.getByTestId("auth-verify-resend-btn")).toBeDisabled();
      // Avanza 30s
      act(() => {
        vi.advanceTimersByTime(30_000);
      });
      expect(screen.getByTestId("auth-verify-resend-timer")).toHaveTextContent("in 0:30");
      // Avanza altri 30s → countdown = 0
      act(() => {
        vi.advanceTimersByTime(30_000);
      });
      // Timer scompare quando canResend (countdown=0)
      expect(screen.queryByTestId("auth-verify-resend-timer")).not.toBeInTheDocument();
      expect(screen.getByTestId("auth-verify-resend-btn")).toBeEnabled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("test 6 · footer 'Ricrea l'account' link naviga a /signup", async () => {
    const user = userEvent.setup();
    renderVerify();
    const link = screen.getByTestId("auth-verify-recreate-link");
    expect(link).toHaveAttribute("href", "/signup");
    await user.click(link);
    expect(await screen.findByTestId("signup-stub")).toBeInTheDocument();
  });
});

afterEach(() => {
  // Safety net
  vi.useRealTimers();
});
