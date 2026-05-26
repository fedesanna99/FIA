/**
 * PercorsiBeamWizard.test.tsx (v1.9.1 T2 · v2.6.3.1 T3).
 * Component test sulle 6 fasi del wizard + callback onLoadTemplate.
 *
 * v2.6.3.1 BUG-#2 fix: il wizard è ora full-page overlay (no Dialog), e
 * gli step 2-6 sono wrapped in `<PercorsoStep>` template handoff. I
 * testid back/next sono cambiati: il forward è `percorso-step-forward`
 * (template), il back è rinominato in `percorso-step-back` (aggiunto in
 * PercorsoStep). Step 1 (selector hub) NON usa il template, quindi
 * usa direttamente le card.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PercorsiBeamWizard } from "./PercorsiBeamWizard";


beforeEach(() => {
  // useModalBackButton sporca history.state — reset cosi' i test sono
  // isolati l'uno dall'altro.
  window.history.replaceState({}, "");
});


/**
 * Helper: click su forward del PercorsoStep template. Match per testid
 * `percorso-step-forward` (Button dentro template handoff).
 */
function clickForward() {
  fireEvent.click(screen.getByTestId("percorso-step-forward"));
}

/**
 * Helper: click su back (button con label "Indietro" dentro PercorsoStep).
 */
function clickBack() {
  fireEvent.click(screen.getByRole("button", { name: /indietro/i }));
}


describe("PercorsiBeamWizard (v2.6.3.1 full-page workspace)", () => {
  it("non renderizza nulla quando open=false", () => {
    const onClose = vi.fn();
    const onLoadTemplate = vi.fn();
    render(<PercorsiBeamWizard open={false} onClose={onClose} onLoadTemplate={onLoadTemplate} />);
    expect(screen.queryByTestId("percorsi-wizard")).toBeNull();
  });

  it("step 1: mostra wizard full-page con 3 card di percorsi pre-set", () => {
    const onClose = vi.fn();
    const onLoadTemplate = vi.fn();
    render(<PercorsiBeamWizard open={true} onClose={onClose} onLoadTemplate={onLoadTemplate} />);
    expect(screen.getByTestId("percorsi-wizard")).toBeInTheDocument();
    expect(screen.getByTestId("percorsi-step-1")).toBeInTheDocument();
    // v2.6.3.1: full-page con max-w-3xl mx-auto invece di Dialog 620px
    expect(screen.getByText(/Scegli un percorso guidato/i)).toBeInTheDocument();
    expect(screen.getByTestId("percorsi-card-trave-bi-appoggiata-uc1")).toBeInTheDocument();
    expect(screen.getByTestId("percorsi-card-telaio-portale-2d")).toBeInTheDocument();
    expect(screen.getByTestId("percorsi-card-mensola-3d")).toBeInTheDocument();
  });

  it("click su card → avanza a step 2 con PercorsoStep template + riepilogo", () => {
    const onClose = vi.fn();
    const onLoadTemplate = vi.fn();
    render(<PercorsiBeamWizard open={true} onClose={onClose} onLoadTemplate={onLoadTemplate} />);
    fireEvent.click(screen.getByTestId("percorsi-card-trave-bi-appoggiata-uc1"));
    // v2.6.3.1: step 2 dentro <PercorsoStep> template (no più dialog body)
    expect(screen.getByTestId("percorso-step")).toBeInTheDocument();
    expect(screen.getByTestId("percorsi-step-2")).toBeInTheDocument();
    // L'h2 display del template porta il title canonico
    expect(screen.getByText(/Vincoli e carichi del percorso/i)).toBeInTheDocument();
    // Riepilogo card scelta visibile dentro body
    expect(screen.getByText("Trave bi-appoggiata · UC1")).toBeInTheDocument();
    expect(screen.getByText(/IPE160/)).toBeInTheDocument();
  });

  it("step 2 → 'Indietro' torna a step 1", () => {
    const onClose = vi.fn();
    const onLoadTemplate = vi.fn();
    render(<PercorsiBeamWizard open={true} onClose={onClose} onLoadTemplate={onLoadTemplate} />);
    fireEvent.click(screen.getByTestId("percorsi-card-telaio-portale-2d"));
    expect(screen.getByTestId("percorsi-step-2")).toBeInTheDocument();
    clickBack();
    expect(screen.getByTestId("percorsi-step-1")).toBeInTheDocument();
  });

  it("step 2 → 'Avanti' avanza a step 3 (Materiali/Sezioni)", () => {
    const onClose = vi.fn();
    const onLoadTemplate = vi.fn();
    render(<PercorsiBeamWizard open={true} onClose={onClose} onLoadTemplate={onLoadTemplate} />);
    fireEvent.click(screen.getByTestId("percorsi-card-trave-bi-appoggiata-uc1"));
    clickForward();
    expect(screen.getByTestId("percorsi-step-3")).toBeInTheDocument();
    expect(screen.getByText(/Carica materiali e sezioni del template/i)).toBeInTheDocument();
  });

  it("step 3 → 'Carica e procedi' chiama onLoadTemplate(templateId) e avanza a step 4", () => {
    // v2.2.0 audit-fix B7 + v2.6.3.1 T3: wizard 6-step.
    // Step 3 "Materiali/Sezioni" → Carica template → avanza a step 4 "Esegui".
    // onClose NON viene chiamato qui (succede solo al "Chiudi" dello step 6).
    const onClose = vi.fn();
    const onLoadTemplate = vi.fn();
    render(<PercorsiBeamWizard open={true} onClose={onClose} onLoadTemplate={onLoadTemplate} />);
    fireEvent.click(screen.getByTestId("percorsi-card-trave-bi-appoggiata-uc1"));
    clickForward(); // step 2 → 3
    clickForward(); // step 3 → 4 (carica)
    expect(onLoadTemplate).toHaveBeenCalledWith("ex_simple_beam_2d");
    expect(onClose).not.toHaveBeenCalled(); // niente close al carica
    expect(screen.getByTestId("percorsi-step-4")).toBeInTheDocument();
  });

  it("step 3 → 'Indietro' torna a step 2", () => {
    const onClose = vi.fn();
    const onLoadTemplate = vi.fn();
    render(<PercorsiBeamWizard open={true} onClose={onClose} onLoadTemplate={onLoadTemplate} />);
    fireEvent.click(screen.getByTestId("percorsi-card-mensola-3d"));
    clickForward(); // step 2 → 3
    clickBack();    // step 3 → 2
    expect(screen.getByTestId("percorsi-step-2")).toBeInTheDocument();
  });

  it("ogni card ha templateId corretto (verifica mapping)", () => {
    function flowThrough(cardTestId: string): string | null {
      const onClose = vi.fn();
      const onLoadTemplate = vi.fn();
      const { unmount } = render(
        <PercorsiBeamWizard open={true} onClose={onClose} onLoadTemplate={onLoadTemplate} />,
      );
      fireEvent.click(screen.getByTestId(cardTestId)); // step 1 → 2
      clickForward(); // step 2 → 3
      clickForward(); // step 3 → 4 (carica template)
      const last = onLoadTemplate.mock.lastCall?.[0] ?? null;
      unmount();
      return last;
    }

    expect(flowThrough("percorsi-card-trave-bi-appoggiata-uc1")).toBe("ex_simple_beam_2d");
    expect(flowThrough("percorsi-card-telaio-portale-2d")).toBe("ex_portal_frame_2d");
    expect(flowThrough("percorsi-card-mensola-3d")).toBe("ex_3d_grid");
  });

  it("v2.6.3.1: step 2 renderizza PercorsoStep aside help (visible solo lg+)", () => {
    const onClose = vi.fn();
    const onLoadTemplate = vi.fn();
    render(<PercorsiBeamWizard open={true} onClose={onClose} onLoadTemplate={onLoadTemplate} />);
    fireEvent.click(screen.getByTestId("percorsi-card-trave-bi-appoggiata-uc1"));
    // Aside help "Perché te lo chiediamo" è renderizzato (hidden lg:block ma
    // nel DOM è sempre presente quando help prop non è undefined).
    expect(screen.getByTestId("percorso-step-help")).toBeInTheDocument();
    expect(screen.getByText(/boundary conditions/i)).toBeInTheDocument();
  });

  it("v2.6.3.1: top close bar è full-page (no Dialog modal)", () => {
    const onClose = vi.fn();
    const onLoadTemplate = vi.fn();
    render(<PercorsiBeamWizard open={true} onClose={onClose} onLoadTemplate={onLoadTemplate} />);
    // Il container root è fixed inset-0 z-dialog full-page
    const root = screen.getByTestId("percorsi-wizard");
    expect(root.className).toContain("fixed");
    expect(root.className).toContain("inset-0");
    // Close button presente
    expect(screen.getByTestId("percorsi-wizard-close")).toBeInTheDocument();
  });
});
