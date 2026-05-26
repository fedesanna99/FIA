/**
 * Shell.test.tsx (v2.6.3.1 BUG-#1 fix).
 *
 * Verifica il workspace takeover (viewport area piena per workspace
 * Verifiche). NB: i test girano in jsdom senza canvas R3F reale —
 * `children` è solo un wrapper data-testid.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Shell } from "./Shell";

// Mock dei panel content (children non sono rilevanti, solo che Shell.tsx
// orchestri correttamente takeover vs normal).
vi.mock("./panels/MakePanel", () => ({
  MakePanel: () => <div data-testid="mock-make-panel">MakePanel</div>,
}));
vi.mock("./panels/SolvePanel", () => ({
  SolvePanel: () => <div data-testid="mock-solve-panel">SolvePanel</div>,
}));
vi.mock("./panels/InspectPanel", () => ({
  InspectPanel: () => <div data-testid="mock-inspect-panel">InspectPanel</div>,
}));
vi.mock("./panels/ToolsPanel", () => ({
  ToolsPanel: () => <div data-testid="mock-tools-panel">ToolsPanel</div>,
}));
vi.mock("./panels/VerifyPanel", () => ({
  VerifyPanel: ({ fullArea }: { fullArea?: boolean }) => (
    <div data-testid="mock-verify-panel" data-full-area={fullArea ? "true" : undefined}>
      VerifyPanel (fullArea={fullArea ? "1" : "0"})
    </div>
  ),
}));

// I sub-component della Shell sono già testati altrove; qui mock-iamo solo
// quello necessario per non rompere il render.
vi.mock("./ShellTopBar", () => ({
  ShellTopBar: () => <div data-testid="mock-topbar">TopBar</div>,
}));
vi.mock("./ShellRail", () => ({
  ShellRail: ({ active, onChange }: { active: string; onChange: (id: string) => void }) => (
    <nav data-testid="mock-rail" data-active={active}>
      <button data-testid="rail-modello" onClick={() => onChange("modello")}>M</button>
      <button data-testid="rail-verifiche" onClick={() => onChange("verifiche")}>V</button>
      <button data-testid="rail-risultati" onClick={() => onChange("risultati")}>R</button>
    </nav>
  ),
}));
vi.mock("./ShellViewport", () => ({
  ShellViewport: ({ children }: { children: React.ReactNode }) => (
    <section data-testid="mock-viewport">{children}</section>
  ),
}));
vi.mock("./ShellPanel", () => ({
  ShellPanel: ({ workspace, children }: { workspace: string; children: React.ReactNode }) => (
    <aside data-testid="mock-shell-panel" data-workspace={workspace}>{children}</aside>
  ),
}));
vi.mock("./ShellStatusBar", () => ({
  ShellStatusBar: () => <div data-testid="mock-statusbar">StatusBar</div>,
}));
vi.mock("./ShellCommandPalette", () => ({
  ShellCommandPalette: () => <div data-testid="mock-palette">Palette</div>,
}));

import { vi } from "vitest";

describe("Shell · workspace takeover (v2.6.3.1 BUG-#1)", () => {
  beforeEach(() => {
    // Reset DOM between tests
  });

  it("default workspace=modello: renders ShellViewport + ShellPanel (normal mode)", () => {
    render(<Shell><div data-testid="canvas-children">Canvas R3F</div></Shell>);
    expect(screen.getByTestId("mock-viewport")).toBeInTheDocument();
    expect(screen.getByTestId("mock-shell-panel")).toBeInTheDocument();
    expect(screen.queryByTestId("shell-takeover-content")).toBeNull();
    // Canvas children è dentro viewport
    expect(screen.getByTestId("canvas-children")).toBeInTheDocument();
  });

  it("switching to verifiche: replaces viewport+panel with takeover-content", () => {
    render(<Shell><div data-testid="canvas-children">Canvas R3F</div></Shell>);
    fireEvent.click(screen.getByTestId("rail-verifiche"));

    // Takeover content visibile
    expect(screen.getByTestId("shell-takeover-content")).toBeInTheDocument();
    // VerifyPanel renderizzato con fullArea=true
    const verify = screen.getByTestId("mock-verify-panel");
    expect(verify).toBeInTheDocument();
    expect(verify.getAttribute("data-full-area")).toBe("true");

    // Viewport e ShellPanel NON renderizzati in takeover
    expect(screen.queryByTestId("mock-viewport")).toBeNull();
    expect(screen.queryByTestId("mock-shell-panel")).toBeNull();
    expect(screen.queryByTestId("canvas-children")).toBeNull();
  });

  it("switching away from verifiche: restores normal mode", () => {
    render(<Shell><div data-testid="canvas-children">Canvas R3F</div></Shell>);
    fireEvent.click(screen.getByTestId("rail-verifiche"));
    expect(screen.getByTestId("shell-takeover-content")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("rail-risultati"));
    expect(screen.queryByTestId("shell-takeover-content")).toBeNull();
    expect(screen.getByTestId("mock-viewport")).toBeInTheDocument();
    expect(screen.getByTestId("mock-shell-panel")).toBeInTheDocument();
  });

  it("shell-takeover-on class is applied to root when in takeover", () => {
    const { container } = render(<Shell><div /></Shell>);
    const root = container.querySelector(".shell");
    expect(root?.className).not.toContain("shell-takeover-on");

    fireEvent.click(screen.getByTestId("rail-verifiche"));
    expect(root?.className).toContain("shell-takeover-on");

    fireEvent.click(screen.getByTestId("rail-modello"));
    expect(root?.className).not.toContain("shell-takeover-on");
  });
});
