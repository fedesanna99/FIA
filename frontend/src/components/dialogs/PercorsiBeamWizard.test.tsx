/**
 * PercorsiBeamWizard.test.tsx (v1.9.1 T2).
 * Component test sulle 3 fasi del wizard + callback onLoadTemplate.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PercorsiBeamWizard } from "./PercorsiBeamWizard";


beforeEach(() => {
  // useModalBackButton sporca history.state — reset cosi' i test sono
  // isolati l'uno dall'altro.
  window.history.replaceState({}, "");
});


describe("PercorsiBeamWizard", () => {
  it("non renderizza nulla quando open=false", () => {
    const onClose = vi.fn();
    const onLoadTemplate = vi.fn();
    render(<PercorsiBeamWizard open={false} onClose={onClose} onLoadTemplate={onLoadTemplate} />);
    expect(screen.queryByTestId("percorsi-wizard")).toBeNull();
  });

  it("step 1: mostra 3 card di percorsi pre-set", () => {
    const onClose = vi.fn();
    const onLoadTemplate = vi.fn();
    render(<PercorsiBeamWizard open={true} onClose={onClose} onLoadTemplate={onLoadTemplate} />);
    expect(screen.getByTestId("percorsi-step-1")).toBeInTheDocument();
    expect(screen.getByTestId("percorsi-card-trave-bi-appoggiata-uc1")).toBeInTheDocument();
    expect(screen.getByTestId("percorsi-card-telaio-portale-2d")).toBeInTheDocument();
    expect(screen.getByTestId("percorsi-card-mensola-3d")).toBeInTheDocument();
  });

  it("click su card → avanza a step 2 con riepilogo", () => {
    const onClose = vi.fn();
    const onLoadTemplate = vi.fn();
    render(<PercorsiBeamWizard open={true} onClose={onClose} onLoadTemplate={onLoadTemplate} />);
    fireEvent.click(screen.getByTestId("percorsi-card-trave-bi-appoggiata-uc1"));
    expect(screen.getByTestId("percorsi-step-2")).toBeInTheDocument();
    // Il riepilogo mostra info specifiche del percorso scelto.
    expect(screen.getByText(/Trave bi-appoggiata · UC1/)).toBeInTheDocument();
    expect(screen.getByText(/IPE160/)).toBeInTheDocument();
  });

  it("step 2 → 'Cambia percorso' torna a step 1", () => {
    const onClose = vi.fn();
    const onLoadTemplate = vi.fn();
    render(<PercorsiBeamWizard open={true} onClose={onClose} onLoadTemplate={onLoadTemplate} />);
    fireEvent.click(screen.getByTestId("percorsi-card-telaio-portale-2d"));
    expect(screen.getByTestId("percorsi-step-2")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("percorsi-back"));
    expect(screen.getByTestId("percorsi-step-1")).toBeInTheDocument();
  });

  it("step 2 → 'Avanti' avanza a step 3", () => {
    const onClose = vi.fn();
    const onLoadTemplate = vi.fn();
    render(<PercorsiBeamWizard open={true} onClose={onClose} onLoadTemplate={onLoadTemplate} />);
    fireEvent.click(screen.getByTestId("percorsi-card-trave-bi-appoggiata-uc1"));
    fireEvent.click(screen.getByTestId("percorsi-next"));
    expect(screen.getByTestId("percorsi-step-3")).toBeInTheDocument();
  });

  it("step 3 → 'Conferma' chiama onLoadTemplate(templateId) + onClose", () => {
    const onClose = vi.fn();
    const onLoadTemplate = vi.fn();
    render(<PercorsiBeamWizard open={true} onClose={onClose} onLoadTemplate={onLoadTemplate} />);
    fireEvent.click(screen.getByTestId("percorsi-card-trave-bi-appoggiata-uc1"));
    fireEvent.click(screen.getByTestId("percorsi-next"));
    fireEvent.click(screen.getByTestId("percorsi-confirm"));
    expect(onLoadTemplate).toHaveBeenCalledWith("ex_simple_beam_2d");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("step 3 → 'Indietro' torna a step 2", () => {
    const onClose = vi.fn();
    const onLoadTemplate = vi.fn();
    render(<PercorsiBeamWizard open={true} onClose={onClose} onLoadTemplate={onLoadTemplate} />);
    fireEvent.click(screen.getByTestId("percorsi-card-mensola-3d"));
    fireEvent.click(screen.getByTestId("percorsi-next"));
    fireEvent.click(screen.getByTestId("percorsi-back-2"));
    expect(screen.getByTestId("percorsi-step-2")).toBeInTheDocument();
  });

  it("ogni card ha templateId corretto (verifica mapping)", () => {
    const onClose = vi.fn();
    const onLoadTemplate = vi.fn();
    const { rerender } = render(
      <PercorsiBeamWizard open={true} onClose={onClose} onLoadTemplate={onLoadTemplate} />,
    );
    // Trave bi-appoggiata → ex_simple_beam_2d
    fireEvent.click(screen.getByTestId("percorsi-card-trave-bi-appoggiata-uc1"));
    fireEvent.click(screen.getByTestId("percorsi-next"));
    fireEvent.click(screen.getByTestId("percorsi-confirm"));
    expect(onLoadTemplate).toHaveBeenLastCalledWith("ex_simple_beam_2d");

    // Re-render fresh per testare telaio
    onLoadTemplate.mockClear();
    onClose.mockClear();
    rerender(<PercorsiBeamWizard open={true} onClose={onClose} onLoadTemplate={onLoadTemplate} />);
    fireEvent.click(screen.getByTestId("percorsi-card-telaio-portale-2d"));
    fireEvent.click(screen.getByTestId("percorsi-next"));
    fireEvent.click(screen.getByTestId("percorsi-confirm"));
    expect(onLoadTemplate).toHaveBeenLastCalledWith("ex_portal_frame_2d");
  });
});
