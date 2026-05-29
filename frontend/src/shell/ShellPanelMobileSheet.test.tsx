// v3.4 Fetta M4 mobile (30/05/2026) — ShellPanelMobileSheet tests.
//
// Verifica:
//   - render header con label "Verifica" e subtitle dinamico (no results)
//   - toggle button cambia sheetState peek <-> expanded
//   - data-sheet-state riflette lo store
//   - chevron data-state riflette lo store
//   - body.style.overflow=hidden quando expanded (scroll lock)
//   - body.style.overflow ripristinato a peek
//   - children renderizzati nel body

import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { ShellPanelMobileSheet } from "./ShellPanelMobileSheet";
import { useMobileSheetStore } from "../store/mobileSheetStore";
import { useResultsStore } from "../store/resultsStore";
import { useAnalysisStore } from "../store/analysisStore";


describe("ShellPanelMobileSheet", () => {
  beforeEach(() => {
    useMobileSheetStore.setState({ sheetState: "peek" });
    useResultsStore.setState({
      staticResults: null, modalResults: null, dynamicResults: null,
      modelHashAtAnalysis: null,
    });
    useAnalysisStore.setState({ isRunning: false, analysisType: "static" });
    document.body.style.overflow = "";
    try { window.localStorage.removeItem("feapro-mobile-sheet"); } catch { /* ignore */ }
  });

  // ─────────────────────────────────────────────────────────────
  // Render base
  // ─────────────────────────────────────────────────────────────

  it("renders the sheet with header title 'Verifica'", () => {
    render(<ShellPanelMobileSheet>content</ShellPanelMobileSheet>);
    expect(screen.getByTestId("shell-panel-mobile-sheet")).toBeInTheDocument();
    expect(screen.getByText("Verifica")).toBeInTheDocument();
  });

  it("renders subtitle 'Nessun calcolo' when no results", () => {
    render(<ShellPanelMobileSheet>content</ShellPanelMobileSheet>);
    expect(screen.getByText(/nessun calcolo/i)).toBeInTheDocument();
  });

  it("renders children inside the body", () => {
    render(
      <ShellPanelMobileSheet>
        <div data-testid="sheet-child">child content</div>
      </ShellPanelMobileSheet>,
    );
    const body = screen.getByTestId("shell-panel-mobile-sheet-body");
    expect(body.querySelector('[data-testid="sheet-child"]')).toBeInTheDocument();
  });

  // ─────────────────────────────────────────────────────────────
  // data-sheet-state riflette lo store + toggle behavior
  // ─────────────────────────────────────────────────────────────

  it("data-sheet-state is 'peek' by default and reflects toggle", () => {
    render(<ShellPanelMobileSheet>content</ShellPanelMobileSheet>);
    const sheet = screen.getByTestId("shell-panel-mobile-sheet");
    expect(sheet.getAttribute("data-sheet-state")).toBe("peek");

    fireEvent.click(screen.getByTestId("shell-panel-mobile-sheet-toggle"));
    expect(sheet.getAttribute("data-sheet-state")).toBe("expanded");

    fireEvent.click(screen.getByTestId("shell-panel-mobile-sheet-toggle"));
    expect(sheet.getAttribute("data-sheet-state")).toBe("peek");
  });

  it("toggle button click mutates mobileSheetStore state", () => {
    render(<ShellPanelMobileSheet>content</ShellPanelMobileSheet>);
    expect(useMobileSheetStore.getState().sheetState).toBe("peek");
    fireEvent.click(screen.getByTestId("shell-panel-mobile-sheet-toggle"));
    expect(useMobileSheetStore.getState().sheetState).toBe("expanded");
  });

  it("aria-expanded reflects sheet state", () => {
    render(<ShellPanelMobileSheet>content</ShellPanelMobileSheet>);
    const btn = screen.getByTestId("shell-panel-mobile-sheet-toggle");
    expect(btn.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(btn);
    expect(btn.getAttribute("aria-expanded")).toBe("true");
  });

  // ─────────────────────────────────────────────────────────────
  // Body scroll lock
  // ─────────────────────────────────────────────────────────────

  it("locks body scroll when expanded, unlocks when back to peek", () => {
    render(<ShellPanelMobileSheet>content</ShellPanelMobileSheet>);
    // Initial peek state: no lock
    expect(document.body.style.overflow).toBe("");
    // Toggle to expanded → lock
    act(() => { fireEvent.click(screen.getByTestId("shell-panel-mobile-sheet-toggle")); });
    expect(document.body.style.overflow).toBe("hidden");
    // Toggle back to peek → unlock (restored to prev "")
    act(() => { fireEvent.click(screen.getByTestId("shell-panel-mobile-sheet-toggle")); });
    expect(document.body.style.overflow).toBe("");
  });

  // ─────────────────────────────────────────────────────────────
  // Subtitle dinamico
  // ─────────────────────────────────────────────────────────────

  it("subtitle says 'Calcolo in corso' when isRunning=true", () => {
    act(() => { useAnalysisStore.setState({ isRunning: true, analysisType: "static" }); });
    render(<ShellPanelMobileSheet>content</ShellPanelMobileSheet>);
    expect(screen.getByText(/calcolo in corso/i)).toBeInTheDocument();
  });

  it("subtitle says 'Statica · completata' when hasStatic", () => {
    act(() => {
      useResultsStore.setState({
        staticResults: { displacements: [], reactions: [], forces: [] } as never,
      });
    });
    render(<ShellPanelMobileSheet>content</ShellPanelMobileSheet>);
    expect(screen.getByText(/statica · completata/i)).toBeInTheDocument();
  });
});
