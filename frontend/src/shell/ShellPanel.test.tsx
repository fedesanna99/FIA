// v2.6.2 Shell · ShellPanel tests
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ShellPanel, ShellPanelSection } from "./ShellPanel";

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
