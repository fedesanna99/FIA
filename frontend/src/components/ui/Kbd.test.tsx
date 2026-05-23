/**
 * Kbd.test.tsx (Precision v2.0 PR6) — smoke kbd primitives.
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Kbd } from "./Kbd";

describe("Kbd", () => {
  it("renderizza come <kbd> element", () => {
    const { container } = render(<Kbd>Ctrl</Kbd>);
    expect(container.querySelector("kbd")).toBeInTheDocument();
  });

  it("mostra il testo passato", () => {
    render(<Kbd>⌘K</Kbd>);
    expect(screen.getByText("⌘K")).toBeInTheDocument();
  });

  it("applica font-mono e bg-bg-hover", () => {
    const { container } = render(<Kbd>X</Kbd>);
    const kbd = container.firstChild as HTMLElement;
    expect(kbd.className).toContain("font-mono");
    expect(kbd.className).toContain("bg-bg-hover");
  });

  it("supporta className custom", () => {
    const { container } = render(<Kbd className="my-2">X</Kbd>);
    expect((container.firstChild as HTMLElement).className).toContain("my-2");
  });
});
