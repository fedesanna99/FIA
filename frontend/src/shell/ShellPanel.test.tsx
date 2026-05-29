// v2.6.2 Shell · ShellPanel tests
// v3.4 Fetta E2-IA Commit E2.2: aggiunti test per bottone X chiusura panel
// destro (collegato a rightPanelStore.close()).
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ShellPanel, ShellPanelSection } from "./ShellPanel";
import { useRightPanelStore } from "../store/rightPanelStore";

describe("ShellPanel", () => {
  it("renders header with workspace title", () => {
    render(<ShellPanel workspace="risultati">content</ShellPanel>);
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Risultati");
  });

  it("renders tabs for the workspace", () => {
    render(<ShellPanel workspace="risultati">content</ShellPanel>);
    // Workspace "risultati" ha tabs: viewport, diagrammi, qualita
    expect(screen.getByRole("tab", { name: /viewport/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /diagrammi/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /qualit/i })).toBeInTheDocument();
  });
});

describe("ShellPanelSection", () => {
  it("renders eyebrow + content", () => {
    render(
      <ShellPanelSection eyebrow="TEST EYEBROW">
        <div>section content</div>
      </ShellPanelSection>,
    );
    expect(screen.getByText("TEST EYEBROW")).toBeInTheDocument();
    expect(screen.getByText("section content")).toBeInTheDocument();
  });

  it("renders action when provided", () => {
    render(
      <ShellPanelSection eyebrow="EYEBROW" action="Apri">
        <div />
      </ShellPanelSection>,
    );
    expect(screen.getByText("Apri")).toBeInTheDocument();
  });
});

// v3.4 Fetta E2-IA Commit E2.2: bottone X chiusura panel destro.
// Cliccando il X il rightPanelStore passa a "closed" e la Shell.tsx
// rimpiazza ShellPanel con ShellRightReopenTab (testato in
// Shell.test.tsx + ShellRightReopenTab.test.tsx).
describe("ShellPanel · Fetta E2-IA E2.2 X close button", () => {
  beforeEach(() => {
    useRightPanelStore.setState({ panelState: "open" });
    try { window.localStorage.removeItem("feapro-right-panel"); } catch { /* ignore */ }
  });

  it("renderizza il bottone X chiusura nell'header (data-testid stabile)", () => {
    render(<ShellPanel workspace="modello">content</ShellPanel>);
    expect(screen.getByTestId("shell-panel-close")).toBeInTheDocument();
  });

  it("il bottone X ha aria-label 'Chiudi pannello' (a11y)", () => {
    render(<ShellPanel workspace="risultati">content</ShellPanel>);
    expect(
      screen.getByRole("button", { name: /chiudi pannello/i }),
    ).toBeInTheDocument();
  });

  it("click sul X chiama rightPanelStore.close() → state = 'closed'", () => {
    render(<ShellPanel workspace="modello">content</ShellPanel>);
    expect(useRightPanelStore.getState().panelState).toBe("open");
    fireEvent.click(screen.getByTestId("shell-panel-close"));
    expect(useRightPanelStore.getState().panelState).toBe("closed");
  });
});
