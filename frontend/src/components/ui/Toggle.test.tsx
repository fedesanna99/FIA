/**
 * Toggle.test.tsx (Precision v2.0 PR6) — switch on/off.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Toggle } from "./Toggle";

describe("Toggle", () => {
  it("renderizza con label visibile", () => {
    render(<Toggle checked={false} onChange={() => {}} label="Dark mode" />);
    expect(screen.getByText("Dark mode")).toBeInTheDocument();
  });

  it("ha role=switch + aria-checked", () => {
    const { container } = render(<Toggle checked={true} onChange={() => {}} ariaLabel="Test" />);
    const btn = container.querySelector('[role="switch"]') as HTMLElement;
    expect(btn).toBeInTheDocument();
    expect(btn.getAttribute("aria-checked")).toBe("true");
  });

  it("click chiama onChange con next state", () => {
    const onChange = vi.fn();
    const { container } = render(<Toggle checked={false} onChange={onChange} ariaLabel="x" />);
    fireEvent.click(container.querySelector('[role="switch"]')!);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("checked=true applica bg-accent", () => {
    const { container } = render(<Toggle checked={true} onChange={() => {}} ariaLabel="x" />);
    expect(container.querySelector('[role="switch"]')!.className).toContain("bg-accent");
  });

  it("checked=false applica bg-bg-hover", () => {
    const { container } = render(<Toggle checked={false} onChange={() => {}} ariaLabel="x" />);
    expect(container.querySelector('[role="switch"]')!.className).toContain("bg-bg-hover");
  });

  it("disabled blocca onChange", () => {
    const onChange = vi.fn();
    const { container } = render(<Toggle checked={false} onChange={onChange} disabled ariaLabel="x" />);
    fireEvent.click(container.querySelector('[role="switch"]')!);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("ariaLabel usato quando label assente", () => {
    const { container } = render(<Toggle checked={false} onChange={() => {}} ariaLabel="Toggle X" />);
    expect(container.querySelector('[role="switch"]')!.getAttribute("aria-label")).toBe("Toggle X");
  });
});
