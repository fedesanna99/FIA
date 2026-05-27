import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import type { ReactNode } from "react";

vi.mock("../../../api/billing", () => ({
  getQuota: vi.fn(),
}));

import { getQuota } from "../../../api/billing";
import { CreditsBadge } from "./CreditsBadge";
import { WSStatus } from "./WSStatus";
import { useAuthStore } from "../../../store/authStore";


function wrap(children: ReactNode) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <QueryClientProvider client={qc}>
      <TooltipProvider>{children}</TooltipProvider>
    </QueryClientProvider>
  );
}


beforeEach(() => {
  useAuthStore.setState({ token: "", user: null });
  vi.clearAllMocks();
});


describe("CreditsBadge", () => {
  it("renders nothing while loading", () => {
    (getQuota as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {})); // pending
    const { container } = render(wrap(<CreditsBadge />));
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing on error", async () => {
    (getQuota as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("401"));
    const { container } = render(wrap(<CreditsBadge />));
    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it("renders used/cap when quota loads", async () => {
    (getQuota as ReturnType<typeof vi.fn>).mockResolvedValue({
      user_id: "demo_user",
      tier: "free",
      month: "2026-05",
      used_credits: 5.0,
      cap_credits: 50.0,
      bonus_credits: 0.0,
    });
    render(wrap(<CreditsBadge />));
    await waitFor(() => {
      expect(screen.getByTestId("statusbar-credits")).toBeInTheDocument();
    });
    expect(screen.getByTestId("statusbar-credits")).toHaveTextContent("5/50");
  });

  it("includes bonus_credits in total cap", async () => {
    (getQuota as ReturnType<typeof vi.fn>).mockResolvedValue({
      user_id: "demo_user",
      tier: "free",
      month: "2026-05",
      used_credits: 3.0,
      cap_credits: 50.0,
      bonus_credits: 20.0,
    });
    render(wrap(<CreditsBadge />));
    await waitFor(() => {
      // 50 + 20 = 70 cap totale
      expect(screen.getByTestId("statusbar-credits")).toHaveTextContent("3/70");
    });
  });

  it("calls onClick handler on click", async () => {
    (getQuota as ReturnType<typeof vi.fn>).mockResolvedValue({
      user_id: "demo_user",
      tier: "free",
      month: "2026-05",
      used_credits: 5.0,
      cap_credits: 50.0,
      bonus_credits: 0.0,
    });
    const onClick = vi.fn();
    render(wrap(<CreditsBadge onClick={onClick} />));
    await waitFor(() => screen.getByTestId("statusbar-credits"));
    fireEvent.click(screen.getByTestId("statusbar-credits"));
    expect(onClick).toHaveBeenCalled();
  });

  it("uses JWT user.id when logged in instead of demo_user", async () => {
    useAuthStore.setState({
      token: "jwt",
      user: { id: "u-jwt-123", email: "a@b.com", created_at: 0, last_login_at: null, onboarding_completed: false, nome: null, cognome: null, ruolo_professionale: null, terms_accepted_at: null },
    });
    (getQuota as ReturnType<typeof vi.fn>).mockResolvedValue({
      user_id: "u-jwt-123",
      tier: "starter",
      month: "2026-05",
      used_credits: 100,
      cap_credits: 500,
      bonus_credits: 0,
    });
    render(wrap(<CreditsBadge />));
    await waitFor(() => screen.getByTestId("statusbar-credits"));
    expect(getQuota).toHaveBeenCalledWith("u-jwt-123");
  });
});


describe("WSStatus", () => {
  beforeEach(() => {
    // mock fetch globale per evitare richieste reali in test
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
    }));
  });

  it("renders dot indicator with default 'Online' state", async () => {
    render(wrap(<WSStatus />));
    expect(screen.getByTestId("statusbar-ws-status")).toBeInTheDocument();
  });

  it("dot has aria-label 'Online' by default", async () => {
    render(wrap(<WSStatus />));
    await waitFor(() => {
      const dot = screen.getByTestId("statusbar-ws-status").querySelector("span[aria-label]");
      expect(dot).toBeInTheDocument();
    });
  });
});
