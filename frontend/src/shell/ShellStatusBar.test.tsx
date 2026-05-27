// v2.6.2 Shell · ShellStatusBar tests
// v2.6.5 D.3 enrichment per A1 mockup — vecchi item Unità + Snap rimossi,
// nuovi item WebSocket + Sync + counter modelli + crediti + ⌘K.
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { ShellStatusBar } from "./ShellStatusBar";
import { useModelStore } from "../store/modelStore";

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe("ShellStatusBar (v2.6.5 D.3)", () => {
  it("renders Online + WebSocket + Sync + version per A1 mockup", () => {
    useModelStore.setState({ model: null } as never);
    render(<ShellStatusBar />, { wrapper });
    expect(screen.getByText(/Online/i)).toBeInTheDocument();
    expect(screen.getByTestId("sb-ws")).toBeInTheDocument();
    expect(screen.getByText(/WebSocket connesso/)).toBeInTheDocument();
    expect(screen.getByTestId("sb-sync")).toBeInTheDocument();
    expect(screen.getByText(/Sync OK/)).toBeInTheDocument();
    expect(screen.getByText(/v2\.\d+/)).toBeInTheDocument();
  });

  it("counter '0 modelli aperti' when no model active", () => {
    useModelStore.setState({ model: null } as never);
    render(<ShellStatusBar />, { wrapper });
    expect(screen.getByText(/0 modelli aperti/)).toBeInTheDocument();
  });

  it("counter '1 modelli aperti' when model is active", () => {
    useModelStore.setState({
      model: {
        id: "m1",
        name: "Trave",
        units: "SI",
        is_3d: false,
        nodes: [{ id: "n1", x: 0, y: 0, z: 0 }],
        elements: [],
        loads: [],
        constraints: [],
      },
    } as never);
    render(<ShellStatusBar />, { wrapper });
    expect(screen.getByText(/1 modelli aperti/)).toBeInTheDocument();
  });

  it("renders ⌘K shortcut hint", () => {
    useModelStore.setState({ model: null } as never);
    render(<ShellStatusBar />, { wrapper });
    expect(screen.getByText("⌘K")).toBeInTheDocument();
    expect(screen.getByText("Cerca")).toBeInTheDocument();
  });

  it("renders crediti inline (sb-credits testid)", () => {
    useModelStore.setState({ model: null } as never);
    render(<ShellStatusBar />, { wrapper });
    // Default quota fallback 100 cap, 0 used
    expect(screen.getByTestId("sb-credits").textContent).toMatch(/\d+\/\d+\s*cr/);
  });
});
