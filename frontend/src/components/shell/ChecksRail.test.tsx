/**
 * ChecksRail.test.tsx (Precision v2.0) — rail verifiche normative.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ChecksRail, type CheckItem } from "./ChecksRail";

const CHECKS: readonly CheckItem[] = [
  { id: "B1", name: "Flessione",  reference: "EC3 §6.2.5", state: "pass", meta: "UC 0.62" },
  { id: "B2", name: "Taglio",     reference: "EC3 §6.2.6", state: "warn", meta: "UC 0.92" },
  { id: "B3", name: "Stabilità",  reference: "EC3 §6.3",   state: "fail", meta: "UC 1.08" },
];

describe("ChecksRail", () => {
  it("renders all checks with header counter", () => {
    render(<ChecksRail checks={CHECKS} />);
    expect(screen.getByTestId("checks-rail")).toBeInTheDocument();
    expect(screen.getByText(/Checks · 3 totali/i)).toBeInTheDocument();
    expect(screen.getByTestId("check-B1")).toBeInTheDocument();
    expect(screen.getByTestId("check-B2")).toBeInTheDocument();
    expect(screen.getByTestId("check-B3")).toBeInTheDocument();
  });

  it("active check has aria-current='true'", () => {
    render(<ChecksRail checks={CHECKS} activeId="B2" />);
    const btn = screen.getByTestId("check-B2");
    expect(btn.getAttribute("aria-current")).toBe("true");
    // gli altri NON devono averlo
    expect(screen.getByTestId("check-B1").getAttribute("aria-current")).toBeNull();
  });

  it("click on a check calls onSelect with id", () => {
    const onSelect = vi.fn();
    render(<ChecksRail checks={CHECKS} onSelect={onSelect} />);
    fireEvent.click(screen.getByTestId("check-B3"));
    expect(onSelect).toHaveBeenCalledWith("B3");
  });
});
