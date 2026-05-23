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

  it("step 3 → 'Carica e procedi' chiama onLoadTemplate(templateId) e avanza a step 4", () => {
    // v2.2.0 audit-fix B7: prima il wizard era 3-step e chiudeva al confirm.
    // Ora è 6-step (Geometria → Vincoli → Materiali → Esegui → Critical → Report).
    // Step 3 "Materiali/Sezioni" → Carica template → avanza a step 4 "Esegui".
    // onClose NON viene chiamato qui (succede solo al "Chiudi" dello step 6).
    const onClose = vi.fn();
    const onLoadTemplate = vi.fn();
    render(<PercorsiBeamWizard open={true} onClose={onClose} onLoadTemplate={onLoadTemplate} />);
    // Click card è già step 1 → 2 (handlePick → setStep(2)).
    fireEvent.click(screen.getByTestId("percorsi-card-trave-bi-appoggiata-uc1"));
    fireEvent.click(screen.getByTestId("percorsi-next")); // step 2 → 3
    fireEvent.click(screen.getByTestId("percorsi-next")); // step 3 → 4 (carica)
    expect(onLoadTemplate).toHaveBeenCalledWith("ex_simple_beam_2d");
    expect(onClose).not.toHaveBeenCalled(); // niente close al carica
    expect(screen.getByTestId("percorsi-step-4")).toBeInTheDocument();
  });

  it("step 3 → 'Indietro' torna a step 2", () => {
    const onClose = vi.fn();
    const onLoadTemplate = vi.fn();
    render(<PercorsiBeamWizard open={true} onClose={onClose} onLoadTemplate={onLoadTemplate} />);
    // Click card è già step 1 → 2 (handlePick triggera setStep(2) direttamente).
    fireEvent.click(screen.getByTestId("percorsi-card-mensola-3d"));
    fireEvent.click(screen.getByTestId("percorsi-next")); // step 2 → 3
    // v2.2.0 B7: testid generico FooterNav (era percorsi-back-2)
    fireEvent.click(screen.getByTestId("percorsi-back"));
    expect(screen.getByTestId("percorsi-step-2")).toBeInTheDocument();
  });

  it("ogni card ha templateId corretto (verifica mapping)", () => {
    // v2.2.0 B7: unmount + new render per evitare leak di state interno
    // tra invocazioni (rerender mantiene stesso component instance).
    function flowThrough(cardTestId: string): string | null {
      const onClose = vi.fn();
      const onLoadTemplate = vi.fn();
      const { unmount } = render(
        <PercorsiBeamWizard open={true} onClose={onClose} onLoadTemplate={onLoadTemplate} />,
      );
      fireEvent.click(screen.getByTestId(cardTestId)); // step 1 → 2
      fireEvent.click(screen.getByTestId("percorsi-next")); // step 2 → 3
      fireEvent.click(screen.getByTestId("percorsi-next")); // step 3 → 4 (carica)
      const last = onLoadTemplate.mock.lastCall?.[0] ?? null;
      unmount();
      return last;
    }

    expect(flowThrough("percorsi-card-trave-bi-appoggiata-uc1")).toBe("ex_simple_beam_2d");
    expect(flowThrough("percorsi-card-telaio-portale-2d")).toBe("ex_portal_frame_2d");
    expect(flowThrough("percorsi-card-mensola-3d")).toBe("ex_3d_grid");
  });
});
