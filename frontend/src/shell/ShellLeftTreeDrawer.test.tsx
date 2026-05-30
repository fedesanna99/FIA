// v3.4 Fetta M3 mobile (30/05/2026) — ShellLeftTreeDrawer tests.
//
// Verifica:
//   - render del drawer + assenza backdrop quando treeState=closed
//   - render del drawer + presenza backdrop quando treeState=open
//   - data-drawer-state riflette lo store
//   - aria-hidden riflette state (closed=true, open=false)
//   - click sul backdrop chiama toggle() del leftTreeStore
//   - body scroll lock attivo (overflow:hidden) quando open, ripristino quando close
//   - children sono renderizzati dentro il drawer (wrapping verificato)

import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ShellLeftTreeDrawer } from "./ShellLeftTreeDrawer";
import { useLeftTreeStore } from "../store/leftTreeStore";


describe("ShellLeftTreeDrawer", () => {
  beforeEach(() => {
    useLeftTreeStore.setState({ treeState: "closed" });
    try { window.localStorage.removeItem("feapro-left-tree"); } catch { /* ignore */ }
    document.body.style.overflow = "";
  });

  it("renders the drawer aside element always (closed by default)", () => {
    render(<ShellLeftTreeDrawer><div>tree content</div></ShellLeftTreeDrawer>);
    const drawer = screen.getByTestId("shell-left-tree-drawer");
    expect(drawer).toBeInTheDocument();
    expect(drawer.tagName).toBe("ASIDE");
    expect(drawer.dataset.drawerState).toBe("closed");
    expect(drawer.getAttribute("aria-hidden")).toBe("true");
  });

  it("backdrop is NOT rendered when treeState=closed", () => {
    render(<ShellLeftTreeDrawer><div>tree</div></ShellLeftTreeDrawer>);
    expect(screen.queryByTestId("shell-left-tree-drawer-backdrop")).toBeNull();
  });

  it("backdrop is rendered when treeState=open", () => {
    useLeftTreeStore.setState({ treeState: "open" });
    render(<ShellLeftTreeDrawer><div>tree</div></ShellLeftTreeDrawer>);
    expect(screen.getByTestId("shell-left-tree-drawer-backdrop")).toBeInTheDocument();
  });

  it("data-drawer-state riflette treeState dello store", () => {
    useLeftTreeStore.setState({ treeState: "open" });
    render(<ShellLeftTreeDrawer><div /></ShellLeftTreeDrawer>);
    const drawer = screen.getByTestId("shell-left-tree-drawer");
    expect(drawer.dataset.drawerState).toBe("open");
    expect(drawer.getAttribute("aria-hidden")).toBe("false");
  });

  it("click sul backdrop chiama toggle() del leftTreeStore", () => {
    useLeftTreeStore.setState({ treeState: "open" });
    render(<ShellLeftTreeDrawer><div /></ShellLeftTreeDrawer>);
    expect(useLeftTreeStore.getState().treeState).toBe("open");
    fireEvent.click(screen.getByTestId("shell-left-tree-drawer-backdrop"));
    expect(useLeftTreeStore.getState().treeState).toBe("closed");
  });

  it("body scroll lock: overflow:hidden quando open, ripristino quando close", () => {
    const { rerender } = render(<ShellLeftTreeDrawer><div /></ShellLeftTreeDrawer>);
    // Closed di default → overflow originale (empty string)
    expect(document.body.style.overflow).toBe("");

    // Apre il drawer
    useLeftTreeStore.setState({ treeState: "open" });
    rerender(<ShellLeftTreeDrawer><div /></ShellLeftTreeDrawer>);
    expect(document.body.style.overflow).toBe("hidden");

    // Chiude il drawer → cleanup useEffect ripristina
    useLeftTreeStore.setState({ treeState: "closed" });
    rerender(<ShellLeftTreeDrawer><div /></ShellLeftTreeDrawer>);
    expect(document.body.style.overflow).toBe("");
  });

  it("body scroll lock: cleanup al unmount", () => {
    useLeftTreeStore.setState({ treeState: "open" });
    const { unmount } = render(<ShellLeftTreeDrawer><div /></ShellLeftTreeDrawer>);
    expect(document.body.style.overflow).toBe("hidden");
    unmount();
    expect(document.body.style.overflow).toBe("");
  });

  it("children renderizzati dentro il drawer (wrapping)", () => {
    render(
      <ShellLeftTreeDrawer>
        <div data-testid="my-tree-content">albero ad-hoc</div>
      </ShellLeftTreeDrawer>,
    );
    const drawer = screen.getByTestId("shell-left-tree-drawer");
    const content = screen.getByTestId("my-tree-content");
    expect(drawer.contains(content)).toBe(true);
    expect(content.textContent).toBe("albero ad-hoc");
  });

  it("drawer ha aria-label per a11y", () => {
    render(<ShellLeftTreeDrawer><div /></ShellLeftTreeDrawer>);
    expect(screen.getByTestId("shell-left-tree-drawer").getAttribute("aria-label"))
      .toBe("Albero modello");
  });
});
