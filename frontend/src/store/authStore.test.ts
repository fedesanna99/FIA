import { describe, it, expect, beforeEach, vi } from "vitest";

import { useAuthStore } from "./authStore";

vi.mock("../api/auth", () => ({
  getMe: vi.fn(),
}));

import { getMe } from "../api/auth";


const mockUser = {
  id: "u-123",
  email: "test@example.com",
  created_at: 1779000000,
  last_login_at: null,
  onboarding_completed: false,
  // v2.7.0 F.5 (D.2=B): signup metadata extension. Backward compat: tutti
  // i campi sono nullable; utente legacy (pre-v2.7.0) li ha tutti a null.
  nome: null,
  cognome: null,
  ruolo_professionale: null,
  terms_accepted_at: null,
};


beforeEach(() => {
  useAuthStore.setState({ token: "", user: null });
  vi.clearAllMocks();
});


describe("authStore", () => {
  it("starts logged out", () => {
    const s = useAuthStore.getState();
    expect(s.token).toBe("");
    expect(s.user).toBeNull();
    expect(s.isLoggedIn()).toBe(false);
  });

  it("setAuth populates token + user", () => {
    useAuthStore.getState().setAuth("jwt.token.here", mockUser);
    const s = useAuthStore.getState();
    expect(s.token).toBe("jwt.token.here");
    expect(s.user).toEqual(mockUser);
    expect(s.isLoggedIn()).toBe(true);
  });

  it("logout clears state", () => {
    useAuthStore.getState().setAuth("t", mockUser);
    useAuthStore.getState().logout();
    const s = useAuthStore.getState();
    expect(s.token).toBe("");
    expect(s.user).toBeNull();
    expect(s.isLoggedIn()).toBe(false);
  });

  it("verifyToken returns false if no token", async () => {
    const result = await useAuthStore.getState().verifyToken();
    expect(result).toBe(false);
    expect(getMe).not.toHaveBeenCalled();
  });

  it("verifyToken refreshes user from server on success", async () => {
    useAuthStore.setState({ token: "valid-token", user: null });
    const fresh = { ...mockUser, last_login_at: 1779999999 };
    (getMe as ReturnType<typeof vi.fn>).mockResolvedValue(fresh);

    const ok = await useAuthStore.getState().verifyToken();
    expect(ok).toBe(true);
    expect(getMe).toHaveBeenCalledWith("valid-token");
    expect(useAuthStore.getState().user).toEqual(fresh);
  });

  it("verifyToken clears state if /me throws (expired/invalid)", async () => {
    useAuthStore.setState({ token: "expired-token", user: mockUser });
    (getMe as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("401"));

    const ok = await useAuthStore.getState().verifyToken();
    expect(ok).toBe(false);
    const s = useAuthStore.getState();
    expect(s.token).toBe("");
    expect(s.user).toBeNull();
  });

  it("isLoggedIn requires both token AND user", () => {
    // Solo token (caso intermedio post-verify in corso): NON loggato
    useAuthStore.setState({ token: "t", user: null });
    expect(useAuthStore.getState().isLoggedIn()).toBe(false);

    // Solo user (impossibile normalmente): NON loggato
    useAuthStore.setState({ token: "", user: mockUser });
    expect(useAuthStore.getState().isLoggedIn()).toBe(false);

    // Entrambi: loggato
    useAuthStore.setState({ token: "t", user: mockUser });
    expect(useAuthStore.getState().isLoggedIn()).toBe(true);
  });
});
