/**
 * Test ShellRightReopenTab (v3.4 Fetta E2-IA · Commit E2.2)
 *
 * Verifica il rendering del componente nei 6 workspace, la chiamata
 * a `rightPanelStore.open()` al click e l'accessibilita' (aria-label).
 */
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { ShellRightReopenTab } from "./ShellRightReopenTab";
import { useRightPanelStore } from "../store/rightPanelStore";


beforeEach(() => {
  useRightPanelStore.setState({ panelState: "closed" });
  window.localStorage.clear();
});


describe("ShellRightReopenTab", () => {
  it("renderizza il testid stabile per E2E/playwright", () => {
    render(<ShellRightReopenTab workspace="risultati" />);
    expect(screen.getByTestId("shell-right-reopen-tab")).toBeInTheDocument();
  });

  it("mostra la label del workspace passato come prop", () => {
    // v3.4 Fetta E2.5b: workspace "risultati" → label "Verifica".
    render(<ShellRightReopenTab workspace="risultati" />);
    expect(screen.getByText("Verifica")).toBeInTheDocument();
  });

  it("default workspace = 'modello' (label 'Modello')", () => {
    render(<ShellRightReopenTab />);
    expect(screen.getByText("Modello")).toBeInTheDocument();
  });

  it("click riapre il panel via rightPanelStore.open()", () => {
    render(<ShellRightReopenTab />);
    expect(useRightPanelStore.getState().panelState).toBe("closed");
    fireEvent.click(screen.getByTestId("shell-right-reopen-tab"));
    expect(useRightPanelStore.getState().panelState).toBe("open");
  });

  it("ha aria-label descrittivo (a11y compliant)", () => {
    render(<ShellRightReopenTab workspace="analisi" />);
    expect(
      screen.getByRole("button", { name: /riapri pannello analisi/i }),
    ).toBeInTheDocument();
  });

  it("supporta tutti i 6 workspace della Shell custom", () => {
    const workspaces: Array<{ id: "modello" | "analisi" | "risultati" | "verifiche" | "io" | "view"; label: string }> = [
      { id: "modello", label: "Modello" },
      { id: "analisi", label: "Analisi" },
      { id: "risultati", label: "Verifica" }, // v3.4 Fetta E2.5b
      { id: "verifiche", label: "Verifiche" },
      { id: "io", label: "I/O & Collab" },
      { id: "view", label: "View" },
    ];
    for (const ws of workspaces) {
      const { unmount } = render(<ShellRightReopenTab workspace={ws.id} />);
      expect(screen.getByText(ws.label)).toBeInTheDocument();
      unmount();
    }
  });
});
