import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("../../api/auth", () => ({
  login: vi.fn(),
  register: vi.fn(),
}));

import { login, register } from "../../api/auth";
import { useAuthStore } from "../../store/authStore";
import { AuthDialog } from "./AuthDialog";


const mockResponse = {
  token: "jwt.token.here",
  token_type: "bearer",
  user: {
    id: "u-123",
    email: "user@example.com",
    created_at: 1779000000,
    last_login_at: null,
  },
};


beforeEach(() => {
  useAuthStore.setState({ token: "", user: null });
  vi.clearAllMocks();
});


describe("AuthDialog", () => {
  it("renders Login mode by default", () => {
    render(<AuthDialog open onClose={() => {}} />);
    expect(screen.getByRole("tab", { name: /Login/i }))
      .toHaveAttribute("aria-selected", "true");
    expect(screen.getByTestId("auth-submit")).toHaveTextContent(/Accedi/i);
  });

  it("can switch to Register mode via tab", async () => {
    const user = userEvent.setup();
    render(<AuthDialog open onClose={() => {}} />);
    await user.click(screen.getByRole("tab", { name: /Registrati/i }));
    expect(screen.getByRole("tab", { name: /Registrati/i }))
      .toHaveAttribute("aria-selected", "true");
    expect(screen.getByTestId("auth-submit")).toHaveTextContent(/Crea account/i);
  });

  it("calls login API on submit in Login mode", async () => {
    (login as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);
    const onClose = vi.fn();
    render(<AuthDialog open onClose={onClose} />);

    fireEvent.change(screen.getByTestId("auth-email"), {
      target: { value: "user@example.com" },
    });
    fireEvent.change(screen.getByTestId("auth-password"), {
      target: { value: "mypassword" },
    });
    fireEvent.submit(document.getElementById("auth-form")!);

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith("user@example.com", "mypassword");
    });
    await waitFor(() => {
      expect(useAuthStore.getState().token).toBe("jwt.token.here");
    });
    expect(useAuthStore.getState().user?.email).toBe("user@example.com");
    expect(onClose).toHaveBeenCalled();
  });

  it("calls register API on submit in Register mode", async () => {
    (register as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);
    const user = userEvent.setup();
    render(<AuthDialog open onClose={() => {}} />);

    await user.click(screen.getByRole("tab", { name: /Registrati/i }));
    fireEvent.change(screen.getByTestId("auth-email"), {
      target: { value: "new@example.com" },
    });
    fireEvent.change(screen.getByTestId("auth-password"), {
      target: { value: "longerThan8" },
    });
    fireEvent.submit(document.getElementById("auth-form")!);

    await waitFor(() => {
      expect(register).toHaveBeenCalledWith("new@example.com", "longerThan8");
    });
  });

  it("rejects short password in Register mode (client-side)", async () => {
    const user = userEvent.setup();
    render(<AuthDialog open onClose={() => {}} initialMode="register" />);

    fireEvent.change(screen.getByTestId("auth-email"), {
      target: { value: "a@b.com" },
    });
    fireEvent.change(screen.getByTestId("auth-password"), {
      target: { value: "short" },
    });
    // Bypass HTML5 minLength via noValidate (form is outside the button)
    const form = document.getElementById("auth-form") as HTMLFormElement;
    form.noValidate = true;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByTestId("auth-error")).toHaveTextContent(/almeno 8/i);
    });
    expect(register).not.toHaveBeenCalled();
  });

  it("displays server error inline on login failure", async () => {
    (login as ReturnType<typeof vi.fn>).mockRejectedValue({
      response: { data: { detail: "invalid email or password" } },
    });
    render(<AuthDialog open onClose={() => {}} />);

    fireEvent.change(screen.getByTestId("auth-email"), {
      target: { value: "wrong@example.com" },
    });
    fireEvent.change(screen.getByTestId("auth-password"), {
      target: { value: "wrongpw" },
    });
    fireEvent.submit(document.getElementById("auth-form")!);

    await waitFor(() => {
      expect(screen.getByTestId("auth-error"))
        .toHaveTextContent(/invalid email or password/i);
    });
    // Token NON impostato
    expect(useAuthStore.getState().token).toBe("");
  });

  it("respects initialMode='register'", () => {
    render(<AuthDialog open onClose={() => {}} initialMode="register" />);
    expect(screen.getByRole("tab", { name: /Registrati/i }))
      .toHaveAttribute("aria-selected", "true");
  });
});
