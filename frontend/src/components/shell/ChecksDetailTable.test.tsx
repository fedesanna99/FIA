/**
 * ChecksDetailTable.test.tsx (Precision v2.0) — table per-element con UC bar.
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ChecksDetailTable, type CheckRow } from "./ChecksDetailTable";

const ROWS: readonly CheckRow[] = [
  { elementId: "B1", section: "HEA 200", forces: { N: 120.5, V: 30.0, M: 80.5 }, uc: 0.62 },
  { elementId: "B2", section: "HEA 200", forces: { N: 140.0, V: 40.0, M: 90.0 }, uc: 0.92 },
  { elementId: "B3", section: "IPE 240", forces: { N: 100.0, V: 20.0, M: 110.0 }, uc: 1.08 },
];

describe("ChecksDetailTable", () => {
  it("renders title + subtitle + element rows", () => {
    render(
      <ChecksDetailTable
        checkId="ec3-flexion"
        title="EC3 §6.2.5 · Flessione"
        subtitle="I-section · cl. 1"
        rows={ROWS}
      />,
    );
    expect(screen.getByTestId("checks-detail-table")).toBeInTheDocument();
    expect(screen.getByText("EC3 §6.2.5 · Flessione")).toBeInTheDocument();
    expect(screen.getByText("I-section · cl. 1")).toBeInTheDocument();
    expect(screen.getByTestId("check-row-B1")).toBeInTheDocument();
    expect(screen.getByTestId("check-row-B3")).toBeInTheDocument();
  });

  it("marks rows with UC >= limit as critical (data-critical=true)", () => {
    render(<ChecksDetailTable checkId="x" title="t" rows={ROWS} />);
    const critical = screen.getByTestId("check-row-B3");
    expect(critical.getAttribute("data-critical")).toBe("true");
    // non-critical row
    expect(screen.getByTestId("check-row-B1").getAttribute("data-critical")).toBeNull();
  });

  it("renders UC max in header with danger tone when max >= 1", () => {
    render(<ChecksDetailTable checkId="x" title="t" rows={ROWS} ucLimit={1.0} />);
    // UC max = 1.08 → tone danger. Più match (header + row UC), prendiamo il primo (header).
    const matches = screen.getAllByText("1.08");
    // Almeno uno deve avere text-danger (header summary, e tipicamente anche la row)
    const hasDanger = matches.some((el) => el.className.includes("text-danger"));
    expect(hasDanger).toBe(true);
  });
});
