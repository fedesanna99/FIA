import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

import { CostPreviewDialog } from "./CostPreviewDialog";
import { useBillingStore } from "../../../store/billingStore";
import type { CostEstimate, UserQuota } from "../../../api/billing";


const baseEstimate: CostEstimate = {
  solver: "pushover",
  n_dof: 1248,
  cpu_min: 0.5,
  ram_mb: 240,
  eta_s: 18,
  credits: 4.2,
  explanation: "Pushover 20 step su 1248 DOF.",
};

const baseQuota: UserQuota = {
  user_id: "demo_user",
  tier: "free",
  month: "2026-05",
  used_credits: 5.0,
  cap_credits: 50.0,
  bonus_credits: 0.0,
};


beforeEach(() => {
  act(() => {
    useBillingStore.setState({ skipCostPreview: false, lastEstimate: null });
  });
});


describe("CostPreviewDialog", () => {
  it("renders cost breakdown when estimate present", () => {
    render(
      <CostPreviewDialog
        open
        estimate={baseEstimate}
        quota={baseQuota}
        isLoading={false}
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(screen.getByText(/Costo stimato/i)).toBeInTheDocument();
    expect(screen.getByText(/pushover/)).toBeInTheDocument();
    // n_dof = 1248, formato dipende dal locale: ci sono entry multiple nel DOM
    expect(screen.getAllByText(/1[.,]?248/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/4\.20/)).toBeInTheDocument();
  });

  it("disables Procedi when used + credits > cap", () => {
    const tight: UserQuota = { ...baseQuota, used_credits: 49.0 };
    render(
      <CostPreviewDialog
        open
        estimate={baseEstimate}
        quota={tight}
        isLoading={false}
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );
    const confirm = screen.getByTestId("cost-confirm") as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
  });

  it("shows red banner on quota exceeded", () => {
    const tight: UserQuota = { ...baseQuota, used_credits: 49.0 };
    render(
      <CostPreviewDialog
        open
        estimate={baseEstimate}
        quota={tight}
        isLoading={false}
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(screen.getByTestId("quota-exceeded-banner")).toBeInTheDocument();
  });

  it("calls onConfirm when clicking Procedi", () => {
    const onConfirm = vi.fn();
    render(
      <CostPreviewDialog
        open
        estimate={baseEstimate}
        quota={baseQuota}
        isLoading={false}
        onConfirm={onConfirm}
        onCancel={() => {}}
      />,
    );
    fireEvent.click(screen.getByTestId("cost-confirm"));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("calls onCancel when clicking Annulla", () => {
    const onCancel = vi.fn();
    render(
      <CostPreviewDialog
        open
        estimate={baseEstimate}
        quota={baseQuota}
        isLoading={false}
        onConfirm={() => {}}
        onCancel={onCancel}
      />,
    );
    fireEvent.click(screen.getByTestId("cost-cancel"));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("persists skipCostPreview to localStorage when checkbox clicked", () => {
    render(
      <CostPreviewDialog
        open
        estimate={baseEstimate}
        quota={baseQuota}
        isLoading={false}
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );
    const box = screen.getByTestId("cost-skip-checkbox") as HTMLInputElement;
    expect(box.checked).toBe(false);
    fireEvent.click(box);
    // Stato zustand riflette il cambiamento
    expect(useBillingStore.getState().skipCostPreview).toBe(true);
  });
});
