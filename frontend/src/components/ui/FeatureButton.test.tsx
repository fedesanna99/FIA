/**
 * FeatureButton.test (v2.5.6 cluster F T3, DEC-A4).
 *
 * Suite del wrapper di `Button` con precondizioni. Mocka `usePreconditions`
 * per controllare lo stato senza dover scrostare i 3 store reali.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import type { ReactNode } from "react";

import { FeatureButton } from "./FeatureButton";
import type { AppPreconditionState } from "../../lib/preconditions";

const stateMock = vi.fn<() => AppPreconditionState>();

vi.mock("../../hooks/usePreconditions", () => ({
  useFeaturePreconditionState: () => stateMock(),
}));

function makeState(over: Partial<AppPreconditionState> = {}): AppPreconditionState {
  return {
    model: null,
    staticResults: null,
    modalResults: null,
    selectedNodeIds: new Set(),
    selectedElementIds: new Set(),
    canUndo: false,
    canRedo: false,
    ...over,
  };
}

function wrap(children: ReactNode) {
  return <TooltipProvider>{children}</TooltipProvider>;
}

beforeEach(() => {
  stateMock.mockReset();
});

describe("FeatureButton · availability", () => {
  it("button enabled + onClick invocato se precondizione soddisfatta", () => {
    stateMock.mockReturnValue(makeState({ canUndo: true }));
    const onClick = vi.fn();
    render(wrap(<FeatureButton featureId="undo" onClick={onClick}>Undo</FeatureButton>));
    const btn = screen.getByRole("button", { name: /undo/i });
    expect(btn).not.toBeDisabled();
    expect(btn.getAttribute("data-precondition-available")).toBe("true");
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("button disabled + onClick NON invocato se precondizione manca", () => {
    stateMock.mockReturnValue(makeState({ canUndo: false }));
    const onClick = vi.fn();
    render(wrap(<FeatureButton featureId="undo" onClick={onClick}>Undo</FeatureButton>));
    const btn = screen.getByRole("button", { name: /undo/i });
    expect(btn).toBeDisabled();
    expect(btn.getAttribute("data-precondition-available")).toBe("false");
    fireEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe("FeatureButton · propose-action", () => {
  it("click su disabled propone azione se proposeActionOnDisabledClick=true", () => {
    stateMock.mockReturnValue(makeState({ staticResults: null }));
    const onClick = vi.fn();
    const onProposeAction = vi.fn();
    render(
      wrap(
        <FeatureButton
          featureId="verify-ec3"
          onClick={onClick}
          proposeActionOnDisabledClick
          onProposeAction={onProposeAction}
        >
          EC3
        </FeatureButton>,
      ),
    );
    const btn = screen.getByRole("button", { name: /ec3/i });
    expect(btn).not.toBeDisabled(); // propose-action lo rende cliccabile
    fireEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
    expect(onProposeAction).toHaveBeenCalledWith("run-static");
  });

  it("senza proposeActionOnDisabledClick, button disabled è disabled standard", () => {
    stateMock.mockReturnValue(makeState({ staticResults: null }));
    const onProposeAction = vi.fn();
    render(
      wrap(
        <FeatureButton
          featureId="verify-ec3"
          onClick={vi.fn()}
          onProposeAction={onProposeAction}
        >
          EC3
        </FeatureButton>,
      ),
    );
    const btn = screen.getByRole("button", { name: /ec3/i });
    expect(btn).toBeDisabled();
    fireEvent.click(btn);
    expect(onProposeAction).not.toHaveBeenCalled();
  });
});

describe("FeatureButton · loading", () => {
  it("loading=true blocca onClick anche con precondizione OK", () => {
    stateMock.mockReturnValue(makeState({ canUndo: true }));
    const onClick = vi.fn();
    render(wrap(<FeatureButton featureId="undo" onClick={onClick} loading>Undo</FeatureButton>));
    const btn = screen.getByRole("button");
    expect(btn).toBeDisabled(); // Button primitive setta disabled quando loading
    fireEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe("FeatureButton · data attributes", () => {
  it("data-feature-id riflette il featureId passato", () => {
    stateMock.mockReturnValue(makeState({ canUndo: true }));
    render(wrap(<FeatureButton featureId="undo" onClick={vi.fn()}>U</FeatureButton>));
    expect(screen.getByRole("button").getAttribute("data-feature-id")).toBe("undo");
  });
});
