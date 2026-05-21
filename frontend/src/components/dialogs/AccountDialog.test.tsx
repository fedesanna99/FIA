import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

vi.mock("../../api/billing", () => ({
  getQuota: vi.fn(),
  setQuotaTier: vi.fn(),
}));
vi.mock("../../api/usage", () => ({
  getUsageSummary: vi.fn(),
  resetQuota: vi.fn(),
  addQuotaBonus: vi.fn(),
}));
vi.mock("../../api/providers-usage", () => ({
  getProvidersSummary: vi.fn(),
}));

import { getQuota, setQuotaTier } from "../../api/billing";
import { getUsageSummary, resetQuota, addQuotaBonus } from "../../api/usage";
import { getProvidersSummary } from "../../api/providers-usage";
import { AccountDialog } from "./AccountDialog";


function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}


const baseQuota = {
  user_id: "demo_user",
  tier: "free" as const,
  month: "2026-05",
  used_credits: 5.0,
  cap_credits: 50.0,
  bonus_credits: 0.0,
};

const baseUsage = {
  user_id: "demo_user",
  window_days: 30,
  n_jobs: 3,
  total_credits: 1.23,
  jobs_by_solver: { linear: 2, pushover: 1 },
  jobs_by_status: { done: 3 },
  last_job_at: 1779264584,
};


const baseProvidersSummary = {
  window_days: 30, domain: null, provider: null, user_id: null,
  rows: [
    {
      domain: "meteo", provider: "open_meteo_archive", endpoint: "extremes",
      n_calls: 12, n_cache_hits: 8, n_errors: 0,
      cache_hit_ratio: 0.667, error_ratio: 0.0,
      avg_latency_ms: 320.5, total_latency_ms: 3846.0,
      last_call_ts: 1779264584000,
    },
    {
      domain: "geocoding", provider: "open_meteo_geocoding", endpoint: "search",
      n_calls: 45, n_cache_hits: 30, n_errors: 1,
      cache_hit_ratio: 0.667, error_ratio: 0.022,
      avg_latency_ms: 180.2, total_latency_ms: 8109.0,
      last_call_ts: 1779265000000,
    },
  ],
  totals: {
    n_calls: 57, n_cache_hits: 38, n_errors: 1,
    cache_hit_ratio: 0.667, error_ratio: 0.018,
  },
};


beforeEach(() => {
  vi.clearAllMocks();
  (getQuota as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(baseQuota);
  (getUsageSummary as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(baseUsage);
  (getProvidersSummary as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(baseProvidersSummary);
});


describe("AccountDialog", () => {
  it("renders Usage tab with summary stats", async () => {
    render(<AccountDialog open onClose={() => {}} />, { wrapper });
    await waitFor(() => {
      // Aspetta che n_jobs e total_credits siano renderizzati (post query)
      expect(screen.getByText("1.23")).toBeInTheDocument();
    });
    // n_jobs=3 viene reso in Stat (e nelle badges 'linear: 2 + pushover: 1');
    // ne troviamo almeno uno
    expect(screen.getAllByText("3").length).toBeGreaterThanOrEqual(1);
  });

  it("renders validation report link", () => {
    render(<AccountDialog open onClose={() => {}} />, { wrapper });
    const link = screen.getByTestId("validation-report-link") as HTMLAnchorElement;
    expect(link.href).toContain("/api/validation/report");
    expect(link.target).toBe("_blank");
  });

  it("changes tier via Tier tab", async () => {
    const user = userEvent.setup();
    (setQuotaTier as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...baseQuota, tier: "starter", cap_credits: 500,
    });
    render(<AccountDialog open onClose={() => {}} />, { wrapper });
    await user.click(screen.getByRole("tab", { name: /Tier/i }));
    await waitFor(() => screen.getByTestId("tier-tab"));
    await user.selectOptions(screen.getByTestId("tier-select"), "starter");
    await user.click(screen.getByTestId("tier-apply"));
    await waitFor(() => {
      expect(setQuotaTier).toHaveBeenCalledWith("demo_user", "starter");
    });
  });

  it("calls resetQuota when clicking Reset mese in Admin tab", async () => {
    const user = userEvent.setup();
    (resetQuota as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(baseQuota);
    render(<AccountDialog open onClose={() => {}} />, { wrapper });
    await user.click(screen.getByRole("tab", { name: /Admin/i }));
    await waitFor(() => screen.getByTestId("admin-tab"));
    await user.click(screen.getByTestId("admin-reset"));
    await waitFor(() => {
      expect(resetQuota).toHaveBeenCalledWith("demo_user");
    });
  });

  it("calls addQuotaBonus with parsed credits", async () => {
    const user = userEvent.setup();
    (addQuotaBonus as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(baseQuota);
    render(<AccountDialog open onClose={() => {}} />, { wrapper });
    await user.click(screen.getByRole("tab", { name: /Admin/i }));
    await waitFor(() => screen.getByTestId("admin-tab"));
    await user.type(screen.getByTestId("admin-bonus-input"), "100");
    await user.click(screen.getByTestId("admin-bonus-apply"));
    await waitFor(() => {
      expect(addQuotaBonus).toHaveBeenCalledWith("demo_user", 100);
    });
  });

  it("renders Providers tab with summary rows (alpha.9)", async () => {
    const user = userEvent.setup();
    render(<AccountDialog open onClose={() => {}} />, { wrapper });
    await user.click(screen.getByRole("tab", { name: /Providers/i }));
    await waitFor(() => screen.getByTestId("providers-tab"));
    // Totale chiamate = 57
    await waitFor(() => {
      expect(screen.getByText("57")).toBeInTheDocument();
    });
    // Provider names visible
    expect(screen.getByText("open_meteo_archive")).toBeInTheDocument();
    expect(screen.getByText("open_meteo_geocoding")).toBeInTheDocument();
    // Cache hit 67%
    const cacheCells = screen.getAllByText("67%");
    expect(cacheCells.length).toBeGreaterThanOrEqual(1);
  });

  it("Providers tab domain filter triggers re-query", async () => {
    const user = userEvent.setup();
    render(<AccountDialog open onClose={() => {}} />, { wrapper });
    await user.click(screen.getByRole("tab", { name: /Providers/i }));
    await waitFor(() => screen.getByTestId("providers-tab"));
    await user.selectOptions(screen.getByTestId("providers-domain"), "meteo");
    await waitFor(() => {
      const calls = (getProvidersSummary as unknown as ReturnType<typeof vi.fn>).mock.calls;
      const last = calls[calls.length - 1];
      expect(last[0]).toEqual(expect.objectContaining({ domain: "meteo" }));
    });
  });

  it("Providers tab window can be changed", async () => {
    const user = userEvent.setup();
    render(<AccountDialog open onClose={() => {}} />, { wrapper });
    await user.click(screen.getByRole("tab", { name: /Providers/i }));
    await waitFor(() => screen.getByTestId("providers-tab"));
    fireEvent.change(screen.getByTestId("providers-window"), { target: { value: "7" } });
    await waitFor(() => {
      const calls = (getProvidersSummary as unknown as ReturnType<typeof vi.fn>).mock.calls;
      expect(calls[calls.length - 1][0]).toEqual(
        expect.objectContaining({ window_days: 7 }),
      );
    });
  });

  it("usage window can be changed", async () => {
    render(<AccountDialog open onClose={() => {}} />, { wrapper });
    await waitFor(() => screen.getByTestId("usage-tab"));
    fireEvent.change(screen.getByTestId("usage-window"), { target: { value: "90" } });
    await waitFor(() => {
      const calls = (getUsageSummary as unknown as ReturnType<typeof vi.fn>).mock.calls;
      expect(calls[calls.length - 1]).toEqual(["demo_user", 90]);
    });
  });
});
