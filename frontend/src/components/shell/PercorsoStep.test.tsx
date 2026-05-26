/**
 * PercorsoStep.test.tsx (Precision v2.0) — template wrapper smoke.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PercorsoStep } from "./PercorsoStep";

describe("PercorsoStep", () => {
  it("renders stepper + title + body content", () => {
    render(
      <PercorsoStep step={2} title="Definisci la geometria">
        <div data-testid="body-content">form here</div>
      </PercorsoStep>,
    );
    expect(screen.getByTestId("percorso-step")).toBeInTheDocument();
    expect(screen.getByText("Definisci la geometria")).toBeInTheDocument();
    expect(screen.getByTestId("body-content")).toBeInTheDocument();
  });

  it("renders subtitle + help aside when help prop provided", () => {
    render(
      <PercorsoStep
        step={1}
        title="Step 1"
        subtitle="Inserisci i nodi"
        help={<p>Perché serve</p>}
      >
        <div>body</div>
      </PercorsoStep>,
    );
    expect(screen.getByText("Inserisci i nodi")).toBeInTheDocument();
    expect(screen.getByTestId("percorso-step-help")).toBeInTheDocument();
    expect(screen.getByText("Perché serve")).toBeInTheDocument();
  });

  it("renders validation chip with status=ok message", () => {
    render(
      <PercorsoStep
        step={1}
        title="Step 1"
        validation={{ status: "ok", message: "5 nodi definiti" }}
      >
        <div>body</div>
      </PercorsoStep>,
    );
    expect(screen.getByText("5 nodi definiti")).toBeInTheDocument();
  });

  it("forwardDisabled disables the Avanti button", () => {
    const onForward = vi.fn();
    render(
      <PercorsoStep
        step={1}
        title="Step 1"
        onForward={onForward}
        forwardDisabled
      >
        <div>body</div>
      </PercorsoStep>,
    );
    const btn = screen.getByTestId("percorso-step-forward") as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it("onBack click calls callback", () => {
    const onBack = vi.fn();
    render(
      <PercorsoStep step={2} title="Step 2" onBack={onBack}>
        <div>body</div>
      </PercorsoStep>,
    );
    fireEvent.click(screen.getByRole("button", { name: /indietro/i }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
