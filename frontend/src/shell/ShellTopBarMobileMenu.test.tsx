// v3.4 Fetta M1 mobile (30/05/2026) — ShellTopBarMobileMenu tests.
//
// Verifica:
//   - render trigger hamburger
//   - click trigger apre il dropdown (Radix Portal)
//   - 10 voci presenti dopo apertura (3 nav + 2 vista + 5 azioni)
//   - Home dispatcha event feapro:go-home (replica desktop)
//   - Cerca apre la palette (workspaceStore)
//   - Albero toggle aggiorna leftTreeStore
//   - Focus toggle aggiorna workspaceStore.isEmptyState
//   - Bell mostra counter se unread > 0
//   - Esc chiude il menu (Radix default behavior)
//
// Pattern: stesso shape di ShellTopBar.test.tsx — render con
// MemoryRouter (necessario per useNavigate) + QueryClientProvider
// (simmetria con ShellTopBar.test, anche se MobileMenu non usa
// React Query direttamente).
//
// Importante: Radix DropdownMenu usa Pointer Events per il trigger,
// che fireEvent.click non simula correttamente in jsdom. Usiamo
// @testing-library/user-event (pattern usato in AccountDialog.test
// e altri test Radix del progetto) che li simula a livello browser-like.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ShellTopBarMobileMenu } from "./ShellTopBarMobileMenu";
import { useWorkspaceStore } from "../store/workspaceStore";
import { useLeftTreeStore } from "../store/leftTreeStore";
import { useNotificationsStore } from "../store/notificationsStore";

// Mock onboarding (libreria pesante + side-effect su PATCH /api/auth/onboarding)
vi.mock("../lib/onboarding", () => ({
  useResetOnboarding: () => () => Promise.resolve(),
  startOnboardingTour: vi.fn(),
}));

function renderWithRouter(node: React.ReactNode) {
  const qc = new QueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>{node}</MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("ShellTopBarMobileMenu", () => {
  beforeEach(() => {
    // Reset stati che il menu legge / muta
    useWorkspaceStore.getState().setPalette(false);
    useWorkspaceStore.getState().exitEmptyState();
    useLeftTreeStore.setState({ treeState: "closed" });
    useNotificationsStore.setState({ items: [] });
    try { window.localStorage.removeItem("feapro-left-tree"); } catch { /* ignore */ }
  });

  // ─────────────────────────────────────────────────────────────
  // Trigger + apertura del menu
  // ─────────────────────────────────────────────────────────────

  it("renders the hamburger trigger button", () => {
    renderWithRouter(<ShellTopBarMobileMenu />);
    expect(screen.getByTestId("topbar-mobile-menu")).toBeInTheDocument();
  });

  it("trigger has aria-label and is initially closed", () => {
    renderWithRouter(<ShellTopBarMobileMenu />);
    const trigger = screen.getByTestId("topbar-mobile-menu");
    expect(trigger.getAttribute("aria-label")).toBe("Apri menu mobile");
    // Radix imposta aria-expanded sul trigger
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    // Content non renderizzato finche' chiuso
    expect(screen.queryByTestId("topbar-mobile-menu-content")).not.toBeInTheDocument();
  });

  it("click on trigger opens the dropdown and shows all 10 items", async () => {
    const user = userEvent.setup();
    renderWithRouter(<ShellTopBarMobileMenu />);
    await user.click(screen.getByTestId("topbar-mobile-menu"));
    // Content presente (Radix lo monta in Portal)
    expect(screen.getByTestId("topbar-mobile-menu-content")).toBeInTheDocument();
    // 10 voci: 3 navigazione + 2 vista + 5 azioni (Search/Undo/Redo/Notif/Tour)
    expect(screen.getByTestId("mobile-menu-home")).toBeInTheDocument();
    expect(screen.getByTestId("mobile-menu-modelli")).toBeInTheDocument();
    expect(screen.getByTestId("mobile-menu-jobs")).toBeInTheDocument();
    expect(screen.getByTestId("mobile-menu-tree")).toBeInTheDocument();
    expect(screen.getByTestId("mobile-menu-focus")).toBeInTheDocument();
    expect(screen.getByTestId("mobile-menu-search")).toBeInTheDocument();
    expect(screen.getByTestId("mobile-menu-undo")).toBeInTheDocument();
    expect(screen.getByTestId("mobile-menu-redo")).toBeInTheDocument();
    expect(screen.getByTestId("mobile-menu-notif")).toBeInTheDocument();
    expect(screen.getByTestId("mobile-menu-tour")).toBeInTheDocument();
  });

  // ─────────────────────────────────────────────────────────────
  // Navigazione · Home / Modelli / Jobs
  // ─────────────────────────────────────────────────────────────

  it("Home dispatches feapro:go-home event (replica desktop)", async () => {
    const user = userEvent.setup();
    renderWithRouter(<ShellTopBarMobileMenu />);
    await user.click(screen.getByTestId("topbar-mobile-menu"));
    const spy = vi.fn();
    window.addEventListener("feapro:go-home", spy);
    await user.click(screen.getByTestId("mobile-menu-home"));
    expect(spy).toHaveBeenCalledTimes(1);
    window.removeEventListener("feapro:go-home", spy);
  });

  // ─────────────────────────────────────────────────────────────
  // Vista · Albero toggle + Focus toggle
  // ─────────────────────────────────────────────────────────────

  it("Albero toggle flips leftTreeStore state", async () => {
    const user = userEvent.setup();
    renderWithRouter(<ShellTopBarMobileMenu />);
    await user.click(screen.getByTestId("topbar-mobile-menu"));
    expect(useLeftTreeStore.getState().treeState).toBe("closed");
    await user.click(screen.getByTestId("mobile-menu-tree"));
    expect(useLeftTreeStore.getState().treeState).toBe("open");
  });

  it("Albero menu item shows On/Off chip reflecting store state", async () => {
    const user = userEvent.setup();
    renderWithRouter(<ShellTopBarMobileMenu />);
    await user.click(screen.getByTestId("topbar-mobile-menu"));
    // Default chiuso → chip "Off"
    const treeItem = screen.getByTestId("mobile-menu-tree");
    expect(treeItem.textContent).toContain("Off");
  });

  it("Focus toggle enters and exits workspaceStore empty state", async () => {
    const user = userEvent.setup();
    renderWithRouter(<ShellTopBarMobileMenu />);
    await user.click(screen.getByTestId("topbar-mobile-menu"));
    expect(useWorkspaceStore.getState().isEmptyState).toBe(false);
    await user.click(screen.getByTestId("mobile-menu-focus"));
    expect(useWorkspaceStore.getState().isEmptyState).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────
  // Azioni · Cerca / Notifiche counter
  // ─────────────────────────────────────────────────────────────

  it("Cerca opens the command palette", async () => {
    const user = userEvent.setup();
    renderWithRouter(<ShellTopBarMobileMenu />);
    await user.click(screen.getByTestId("topbar-mobile-menu"));
    expect(useWorkspaceStore.getState().paletteOpen).toBe(false);
    await user.click(screen.getByTestId("mobile-menu-search"));
    expect(useWorkspaceStore.getState().paletteOpen).toBe(true);
  });

  it("Notifiche shows unread counter when items unread > 0", async () => {
    act(() => {
      useNotificationsStore.setState({
        items: [
          { id: 1, read: false, title: "n1", message: "", level: "info", ts: 1700000000000 },
          { id: 2, read: false, title: "n2", message: "", level: "info", ts: 1700000000000 },
        ],
      });
    });
    const user = userEvent.setup();
    renderWithRouter(<ShellTopBarMobileMenu />);
    await user.click(screen.getByTestId("topbar-mobile-menu"));
    const notif = screen.getByTestId("mobile-menu-notif");
    // Chip "2" presente nel testo dell'item
    expect(notif.textContent).toContain("2");
  });

  // ─────────────────────────────────────────────────────────────
  // Esc chiude (Radix default behavior)
  // ─────────────────────────────────────────────────────────────

  it("Esc keypress closes the dropdown menu", async () => {
    const user = userEvent.setup();
    renderWithRouter(<ShellTopBarMobileMenu />);
    await user.click(screen.getByTestId("topbar-mobile-menu"));
    expect(screen.getByTestId("topbar-mobile-menu-content")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    // Content rimosso dal DOM dopo Esc
    expect(screen.queryByTestId("topbar-mobile-menu-content")).not.toBeInTheDocument();
  });
});
