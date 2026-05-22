import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { Dialog } from "./Dialog";


/**
 * v1.5.2 Task 37: audit click-outside per i 4 pattern modali dell'app.
 *   - Radix Dialog (ui/Dialog.tsx) — gestito by default da Radix
 *   - Custom Dialog (dialogs/Dialog.tsx) — coperto qui sotto
 *   - WizardShell (dialogs/wizards/WizardShell.tsx) — backdrop + stopPropagation
 *   - HelpSheet — backdrop con onClick={() => setOpen(false)}
 *
 * Questo test serve da spec di non-regressione: garantisce che il click
 * sul backdrop chiude il dialog mentre il click sul container interno
 * (e sui suoi child) NON propaga al backdrop.
 */
describe("dialogs/Dialog (custom)", () => {
  it("click on backdrop calls onClose", () => {
    const onClose = vi.fn();
    const { container } = render(
      <Dialog open onClose={onClose} title="Test">
        <div data-testid="inner-content">Body</div>
      </Dialog>,
    );
    // Il backdrop e' il primo div di livello superiore con fixed inset-0
    const backdrop = container.querySelector("div.fixed.inset-0") as HTMLElement;
    expect(backdrop).toBeTruthy();
    // Simula un click che HA come target il backdrop stesso (non un suo child).
    // fireEvent.click di default usa event target = element, quindi questo
    // riproduce esattamente lo scenario "user clicca fuori dal panel".
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("click on inner container does NOT trigger onClose", () => {
    const onClose = vi.fn();
    render(
      <Dialog open onClose={onClose} title="Test">
        <div data-testid="inner-content">Body</div>
      </Dialog>,
    );
    fireEvent.click(screen.getByTestId("inner-content"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("Escape key closes the dialog", () => {
    const onClose = vi.fn();
    render(
      <Dialog open onClose={onClose} title="Test">
        <p>Body</p>
      </Dialog>,
    );
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("X close button calls onClose", () => {
    const onClose = vi.fn();
    render(
      <Dialog open onClose={onClose} title="Test">
        <p>Body</p>
      </Dialog>,
    );
    fireEvent.click(screen.getByLabelText("Chiudi"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not render when open=false", () => {
    const onClose = vi.fn();
    render(
      <Dialog open={false} onClose={onClose} title="Test">
        <p>Body</p>
      </Dialog>,
    );
    expect(screen.queryByText("Test")).toBeNull();
  });
});
