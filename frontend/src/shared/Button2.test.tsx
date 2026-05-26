// v2.6.1 foundation · test Button2 primitive
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Button2 } from "./Button2";

describe("Button2", () => {
  it("renders primary variant with default styling", () => {
    render(<Button2>Conferma</Button2>);
    const btn = screen.getByRole("button", { name: /conferma/i });
    expect(btn.className).toContain("bg-accent");
    expect(btn.className).toContain("text-white");
  });

  it("renders secondary variant with border", () => {
    render(<Button2 variant="secondary">Annulla</Button2>);
    const btn = screen.getByRole("button", { name: /annulla/i });
    expect(btn.className).toContain("bg-transparent");
    expect(btn.className).toContain("border-border");
  });

  it("calls onClick handler when clicked", () => {
    const onClick = vi.fn();
    render(<Button2 onClick={onClick}>Click me</Button2>);
    fireEvent.click(screen.getByRole("button", { name: /click me/i }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("respects disabled prop and skips onClick", () => {
    const onClick = vi.fn();
    render(
      <Button2 onClick={onClick} disabled>
        Disabled
      </Button2>,
    );
    const btn = screen.getByRole("button", { name: /disabled/i });
    expect(btn).toBeDisabled();
    fireEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("shows loading placeholder and disables interaction", () => {
    const onClick = vi.fn();
    render(
      <Button2 onClick={onClick} loading>
        Salva
      </Button2>,
    );
    const btn = screen.getByRole("button");
    expect(btn).toBeDisabled();
    expect(btn.textContent).toContain("…");
    fireEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });
});
