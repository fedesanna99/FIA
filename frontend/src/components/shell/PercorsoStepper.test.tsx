/**
 * PercorsoStepper.test.tsx (Precision v2.0 PR7).
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PercorsoStepper, PERCORSO_STEPS_6 } from "./PercorsoStepper";

describe("PercorsoStepper", () => {
  it("renderizza i 6 step canonical", () => {
    render(<PercorsoStepper steps={PERCORSO_STEPS_6} currentStep={1} />);
    for (const step of PERCORSO_STEPS_6) {
      expect(screen.getByTestId(`stepper-${step.id}`)).toBeInTheDocument();
    }
  });

  it("step prima del current sono 'done' (Check icon)", () => {
    const { container } = render(<PercorsoStepper steps={PERCORSO_STEPS_6} currentStep={3} />);
    // Step 1 e 2 sono done → hanno lucide check
    const checks = container.querySelectorAll('svg');
    expect(checks.length).toBeGreaterThanOrEqual(2);
  });

  it("step current ha aria-current='step'", () => {
    render(<PercorsoStepper steps={PERCORSO_STEPS_6} currentStep={2} />);
    const currentBtn = screen.getByTestId("stepper-vincoli-carichi").querySelector('button');
    expect(currentBtn?.getAttribute("aria-current")).toBe("step");
  });

  it("step todo sono disabilitati", () => {
    render(<PercorsoStepper steps={PERCORSO_STEPS_6} currentStep={2} onStepClick={() => {}} />);
    const todoBtn = screen.getByTestId("stepper-report").querySelector('button') as HTMLButtonElement;
    expect(todoBtn.disabled).toBe(true);
  });

  it("step done sono cliccabili e chiamano onStepClick con numero", () => {
    const onClick = vi.fn();
    render(<PercorsoStepper steps={PERCORSO_STEPS_6} currentStep={4} onStepClick={onClick} />);
    const doneBtn = screen.getByTestId("stepper-geometria").querySelector('button')!;
    fireEvent.click(doneBtn);
    expect(onClick).toHaveBeenCalledWith(1);
  });

  it("compact=true non mostra le label testuali", () => {
    render(<PercorsoStepper steps={PERCORSO_STEPS_6} currentStep={1} compact />);
    // Le label tipo "Geometria" non devono essere visibili
    expect(screen.queryByText("Geometria")).toBeNull();
  });

  it("compact=false (default) mostra le label", () => {
    render(<PercorsoStepper steps={PERCORSO_STEPS_6} currentStep={1} />);
    expect(screen.getByText("Geometria")).toBeInTheDocument();
  });

  it("currentStep=0 → tutti gli step sono todo", () => {
    render(<PercorsoStepper steps={PERCORSO_STEPS_6} currentStep={0} onStepClick={() => {}} />);
    const firstBtn = screen.getByTestId("stepper-geometria").querySelector('button') as HTMLButtonElement;
    expect(firstBtn.disabled).toBe(true);
  });

  it("connector tra step done è cyan (accent), tra todo è grigio", () => {
    const { container } = render(<PercorsoStepper steps={PERCORSO_STEPS_6} currentStep={3} />);
    const connectors = container.querySelectorAll('[aria-hidden="true"].h-px');
    // 5 connector tra 6 step. Almeno il primo è bg-accent (step 1 done).
    expect(connectors.length).toBe(5);
    expect((connectors[0] as HTMLElement).className).toContain("bg-accent");
  });

  it("PERCORSO_STEPS_6 esporta esattamente 6 step", () => {
    expect(PERCORSO_STEPS_6).toHaveLength(6);
  });

  it("steps sono nell'ordine atteso (geometria → report)", () => {
    expect(PERCORSO_STEPS_6[0].id).toBe("geometria");
    expect(PERCORSO_STEPS_6[5].id).toBe("report");
  });
});
