/**
 * Test StepGeometry · v3.5 Fetta D3 (30/05/2026)
 *
 * Verifica:
 *   - render form 4 campi con default values
 *   - render preview SVG con nodi/elementi default (1 bay, slope 0)
 *   - render aside: 3 preset + about
 *   - click preset cambia form values
 *   - onSubmit valida + scrive a modelStore + chiama callback
 *   - validation: range params (1-3 bays, 3-8m span, 3-6m height, 0-30 slope)
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { StepGeometry } from "./StepGeometry";
import { useModelStore } from "../../store/modelStore";


beforeEach(() => {
  useModelStore.setState({ model: null });
});


describe("StepGeometry · D3 parametric form + preview", () => {
  it("renderizza il body 3-col (form + preview + aside)", () => {
    render(<StepGeometry />);
    expect(screen.getByTestId("step-geometry-body")).toBeInTheDocument();
    expect(screen.getByTestId("step-geometry-preview")).toBeInTheDocument();
    expect(screen.getByTestId("step-geometry-aside")).toBeInTheDocument();
  });

  it("form ha 4 campi con default values (1 bay, 5m span, 4m height, 0 slope)", () => {
    render(<StepGeometry />);
    expect((screen.getByTestId("ptd-geom-bays") as HTMLInputElement).value).toBe("1");
    expect((screen.getByTestId("ptd-geom-span") as HTMLInputElement).value).toBe("5");
    expect((screen.getByTestId("ptd-geom-height") as HTMLInputElement).value).toBe("4");
    expect((screen.getByTestId("ptd-geom-slope") as HTMLInputElement).value).toBe("0");
  });

  it("preview SVG presente + summary mostra nodi/elementi count default", () => {
    render(<StepGeometry />);
    expect(screen.getByTestId("step-geometry-svg")).toBeInTheDocument();
    // 1 bay slope 0 = 4 nodi (2 base + 2 eaves) + 3 elementi (2 col + 1 trav)
    const preview = screen.getByTestId("step-geometry-preview");
    expect(preview.textContent).toContain("4 nodi");
    expect(preview.textContent).toContain("3 elementi");
  });

  it("3 preset cards visibili (single-warehouse + multi-bay + canopy)", () => {
    render(<StepGeometry />);
    expect(screen.getByTestId("step-geometry-preset-single-warehouse")).toBeInTheDocument();
    expect(screen.getByTestId("step-geometry-preset-multi-bay-industrial")).toBeInTheDocument();
    expect(screen.getByTestId("step-geometry-preset-canopy")).toBeInTheDocument();
  });

  it("click preset 'multi-bay-industrial' aggiorna form a 3 bays + 5m + 5m + 15°", () => {
    render(<StepGeometry />);
    fireEvent.click(screen.getByTestId("step-geometry-preset-multi-bay-industrial"));
    expect((screen.getByTestId("ptd-geom-bays") as HTMLInputElement).value).toBe("3");
    expect((screen.getByTestId("ptd-geom-span") as HTMLInputElement).value).toBe("5");
    expect((screen.getByTestId("ptd-geom-height") as HTMLInputElement).value).toBe("5");
    expect((screen.getByTestId("ptd-geom-slope") as HTMLInputElement).value).toBe("15");
  });

  it("preview SVG si aggiorna su preset click (canopy → 4 nodi 3 elem)", () => {
    render(<StepGeometry />);
    fireEvent.click(screen.getByTestId("step-geometry-preset-canopy"));
    // canopy: 1 bay 4m + 3m + slope 0 = 4 nodi + 3 elem
    const preview = screen.getByTestId("step-geometry-preview");
    expect(preview.textContent).toContain("4 nodi");
    expect(preview.textContent).toContain("3 elementi");
  });

  it("preset multi-bay slope 15° → 8 nodi (4base + 4eaves) + 0 apex... wait", () => {
    render(<StepGeometry />);
    fireEvent.click(screen.getByTestId("step-geometry-preset-multi-bay-industrial"));
    // 3 bays slope 15: 4 colonne (8 nodi base/eaves) + 3 apex = 11 nodi
    //                   4 elem col + 2 falde/bay × 3 bay = 4 + 6 = 10 elem
    const preview = screen.getByTestId("step-geometry-preview");
    expect(preview.textContent).toContain("11 nodi");
    expect(preview.textContent).toContain("10 elementi");
  });

  it("submit valido: scrive model a modelStore + chiama onSubmit", () => {
    const onSubmit = vi.fn();
    render(<StepGeometry onSubmit={onSubmit} />);
    expect(useModelStore.getState().model).toBeNull();
    fireEvent.click(screen.getByTestId("step-geometry-submit"));
    expect(useModelStore.getState().model).not.toBeNull();
    expect(useModelStore.getState().model?.name).toContain("Telaio 2D");
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("validation: bays fuori range mostra error + submit disabled", () => {
    render(<StepGeometry />);
    const baysInput = screen.getByTestId("ptd-geom-bays") as HTMLInputElement;
    fireEvent.change(baysInput, { target: { value: "5" } }); // > 3
    expect(screen.getByTestId("step-geometry-error").textContent).toContain("1-3");
    expect((screen.getByTestId("step-geometry-submit") as HTMLButtonElement).disabled).toBe(true);
  });
});
