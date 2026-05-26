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

  // v2.6.4 B.2: dynamic header per element type
  it("beam2D (default) shows N | V | M columns", () => {
    render(<ChecksDetailTable checkId="x" title="t" rows={ROWS} />);
    const headers = screen.getAllByRole("columnheader").map((h) => h.textContent ?? "");
    expect(headers).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Elemento"),
        expect.stringContaining("Sezione"),
        expect.stringContaining("N (kN)"),
        expect.stringContaining("V (kN)"),
        expect.stringContaining("M (kNm)"),
        expect.stringContaining("UC"),
        expect.stringContaining("Status"),
      ]),
    );
  });

  it("beam3D shows N | Vy | Vz | My | Mz | T columns", () => {
    const rows3D: CheckRow[] = [
      { elementId: "C1", section: "HEM 240", forces: { N: 50, Vy: 10, Vz: 8, My: 25, Mz: 30, T: 2 }, uc: 0.5 },
    ];
    render(<ChecksDetailTable checkId="x" title="t" rows={rows3D} elementType="beam3D" />);
    const headers = screen.getAllByRole("columnheader").map((h) => h.textContent ?? "");
    expect(headers.some((h) => h.includes("Vy"))).toBe(true);
    expect(headers.some((h) => h.includes("Vz"))).toBe(true);
    expect(headers.some((h) => h.includes("My"))).toBe(true);
    expect(headers.some((h) => h.includes("Mz"))).toBe(true);
    expect(headers.some((h) => h.includes("T (kNm)"))).toBe(true);
    // NON deve avere la generica "V (kN)" beam2D
    expect(headers.some((h) => /^V \(kN\)/.test(h))).toBe(false);
  });

  it("shell shows σ_x_top | σ_y_top | τ_xy | σ_VM columns + Spessore", () => {
    const rowsShell: CheckRow[] = [
      {
        elementId: "S1",
        section: "—",
        thickness: 8.0,
        stresses: { sigmaXTop: 120, sigmaYTop: 80, tauXY: 30, sigmaVM: 145 },
        uc: 0.55,
      },
    ];
    render(<ChecksDetailTable checkId="x" title="t" rows={rowsShell} elementType="shell" />);
    const headers = screen.getAllByRole("columnheader").map((h) => h.textContent ?? "");
    expect(headers.some((h) => h.includes("Spessore"))).toBe(true);
    expect(headers.some((h) => h.includes("σ_x_top"))).toBe(true);
    expect(headers.some((h) => h.includes("σ_y_top"))).toBe(true);
    expect(headers.some((h) => h.includes("τ_xy"))).toBe(true);
    expect(headers.some((h) => h.includes("σ_VM"))).toBe(true);
  });

  it("solid shows σ_x | σ_y | σ_z | τ_xy | σ_VM columns", () => {
    const rowsSolid: CheckRow[] = [
      {
        elementId: "H1",
        section: "S275",
        stresses: { sigmaX: 100, sigmaY: 50, sigmaZ: 30, tauXY: 20, sigmaVM: 110 },
        uc: 0.42,
      },
    ];
    render(<ChecksDetailTable checkId="x" title="t" rows={rowsSolid} elementType="solid" />);
    const headers = screen.getAllByRole("columnheader").map((h) => h.textContent ?? "");
    expect(headers.some((h) => h.includes("σ_x"))).toBe(true);
    expect(headers.some((h) => h.includes("σ_y"))).toBe(true);
    expect(headers.some((h) => h.includes("σ_z"))).toBe(true);
    expect(headers.some((h) => h.includes("σ_VM"))).toBe(true);
  });

  it("truss shows only N column (no V/M)", () => {
    const rowsTruss: CheckRow[] = [
      { elementId: "T1", section: "Tondo 16", forces: { N: 25.5 }, uc: 0.3 },
    ];
    render(<ChecksDetailTable checkId="x" title="t" rows={rowsTruss} elementType="truss" />);
    const headers = screen.getAllByRole("columnheader").map((h) => h.textContent ?? "");
    expect(headers.some((h) => h.includes("N (kN)"))).toBe(true);
    expect(headers.some((h) => /^V \(kN\)/.test(h))).toBe(false);
    expect(headers.some((h) => /^M \(kNm\)/.test(h))).toBe(false);
  });

  it("data-element-type attribute reflects elementType prop", () => {
    render(<ChecksDetailTable checkId="x" title="t" rows={ROWS} elementType="solid" />);
    const headerRow = screen.getAllByRole("row")[0];
    expect(headerRow.getAttribute("data-element-type")).toBe("solid");
  });
});
