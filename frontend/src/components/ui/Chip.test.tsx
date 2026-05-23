/**
 * Chip.test.tsx (Precision v2.0 PR6) — smoke + tone variants.
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Chip } from "./Chip";

describe("Chip", () => {
  it("renderizza children", () => {
    render(<Chip>Test</Chip>);
    expect(screen.getByText("Test")).toBeInTheDocument();
  });

  it("tone neutral è default", () => {
    const { container } = render(<Chip>x</Chip>);
    expect(container.querySelector(".bg-bg-hover")).toBeInTheDocument();
  });

  it("tone info applica bg-bg-info + text-accent", () => {
    const { container } = render(<Chip tone="info">x</Chip>);
    const span = container.firstChild as HTMLElement;
    expect(span.className).toContain("bg-bg-info");
    expect(span.className).toContain("text-accent");
  });

  it("tone success/warn/coral/purple/danger sono tutti riconosciuti", () => {
    for (const tone of ["success", "warn", "coral", "purple", "danger"] as const) {
      const { container } = render(<Chip tone={tone}>x</Chip>);
      const span = container.firstChild as HTMLElement;
      expect(span.className).toContain(`bg-bg-${tone}`);
    }
  });

  it("dot=true mostra dot indicator", () => {
    const { container } = render(<Chip tone="success" dot>x</Chip>);
    expect(container.querySelector(".rounded-full")).toBeInTheDocument();
  });

  it("dot=false non mostra dot", () => {
    const { container } = render(<Chip tone="success">x</Chip>);
    expect(container.querySelector(".rounded-full")).toBeNull();
  });

  it("icon prop renderizza node passato", () => {
    render(<Chip icon={<span data-testid="custom-icon">★</span>}>x</Chip>);
    expect(screen.getByTestId("custom-icon")).toBeInTheDocument();
  });

  it("className custom è additivo", () => {
    const { container } = render(<Chip className="extra-class">x</Chip>);
    const span = container.firstChild as HTMLElement;
    expect(span.className).toContain("extra-class");
  });
});
