/**
 * IconButton.test.tsx (Precision v2.0 PR6) — icon-only 28x28.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { IconButton } from "./IconButton";

describe("IconButton", () => {
  it("renderizza con aria-label obbligatorio", () => {
    const { container } = render(
      <IconButton aria-label="Cerca">★</IconButton>,
    );
    expect(container.querySelector('[aria-label="Cerca"]')).toBeInTheDocument();
  });

  it("click chiama onClick", () => {
    const onClick = vi.fn();
    render(
      <IconButton aria-label="x" onClick={onClick}>★</IconButton>,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("variant ghost (default) usa text-ink-2 hover", () => {
    const { container } = render(<IconButton aria-label="x">★</IconButton>);
    expect((container.firstChild as HTMLElement).className).toContain("text-ink-2");
  });

  it("variant outline aggiunge border", () => {
    const { container } = render(<IconButton aria-label="x" variant="outline">★</IconButton>);
    expect((container.firstChild as HTMLElement).className).toContain("border");
  });

  it("variant accent usa text-accent", () => {
    const { container } = render(<IconButton aria-label="x" variant="accent">★</IconButton>);
    expect((container.firstChild as HTMLElement).className).toContain("text-accent");
  });

  it("size sm = 24x24", () => {
    const { container } = render(<IconButton aria-label="x" size="sm">★</IconButton>);
    expect((container.firstChild as HTMLElement).className).toContain("w-6");
  });

  it("size md (default) = 28x28", () => {
    const { container } = render(<IconButton aria-label="x">★</IconButton>);
    expect((container.firstChild as HTMLElement).className).toContain("w-7");
  });

  it("disabled applica opacity-40", () => {
    const { container } = render(<IconButton aria-label="x" disabled>★</IconButton>);
    expect((container.firstChild as HTMLElement).className).toContain("disabled:opacity-40");
  });
});
