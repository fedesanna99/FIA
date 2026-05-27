import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TooltipProvider } from "@radix-ui/react-tooltip";

import { GlobalSearch } from "./GlobalSearch";
import { AICopilotButton } from "./AICopilotButton";
import { CollabAvatars } from "./CollabAvatars";
import { useWorkspaceStore } from "../../../store/workspaceStore";
import { useModelStore } from "../../../store/modelStore";
import { useAuthStore } from "../../../store/authStore";


function wrap(children: React.ReactNode) {
  return <TooltipProvider>{children}</TooltipProvider>;
}


beforeEach(() => {
  useWorkspaceStore.setState({
    workspace: "model",
    activeTab: {} as any,
    helpOpen: false,
    paletteOpen: false,
  });
  useModelStore.setState({ model: null } as any);
  useAuthStore.setState({ token: "", user: null });
  window.localStorage.clear();
});


// v1.7-polish T1: rimossa suite "Breadcrumb" insieme al componente
// `topbar/Breadcrumb.tsx` (legacy non referenziato da nessun import).

describe("GlobalSearch", () => {
  it("renders desktop button with Ctrl+K hint", () => {
    render(wrap(<GlobalSearch />));
    const btn = screen.getByTestId("topbar-search");
    expect(btn).toHaveTextContent(/Cerca/);
    expect(btn).toHaveTextContent(/Ctrl K/);
  });

  it("click opens command palette (togglePalette)", () => {
    render(wrap(<GlobalSearch />));
    expect(useWorkspaceStore.getState().paletteOpen).toBe(false);
    fireEvent.click(screen.getByTestId("topbar-search"));
    expect(useWorkspaceStore.getState().paletteOpen).toBe(true);
  });

  it("mobile button exists with aria-label", () => {
    render(wrap(<GlobalSearch />));
    expect(screen.getByTestId("topbar-search-mobile")).toBeInTheDocument();
  });
});


describe("AICopilotButton", () => {
  it("renders with 'soon' chip in tooltip", () => {
    render(wrap(<AICopilotButton />));
    expect(screen.getByTestId("topbar-ai")).toBeInTheDocument();
  });

  it("click does not crash (toast info)", () => {
    render(wrap(<AICopilotButton />));
    fireEvent.click(screen.getByTestId("topbar-ai"));
    // No assertion: toast is global side-effect; just check no throw
    expect(screen.getByTestId("topbar-ai")).toBeInTheDocument();
  });
});


describe("CollabAvatars", () => {
  it("renders nothing when anonymous", () => {
    render(wrap(<CollabAvatars />));
    expect(screen.queryByTestId("topbar-collab")).toBeNull();
  });

  it("renders avatar with initials when logged in", () => {
    useAuthStore.setState({
      token: "jwt",
      user: { id: "u1", email: "mario.rossi@example.com", created_at: 0, last_login_at: null, onboarding_completed: false, nome: null, cognome: null, ruolo_professionale: null, terms_accepted_at: null },
    });
    render(wrap(<CollabAvatars />));
    const el = screen.getByTestId("topbar-collab");
    expect(el).toBeInTheDocument();
    // "mario.rossi" → "MR"
    expect(el).toHaveTextContent("MR");
  });

  it("handles single-word email username (no separator)", () => {
    useAuthStore.setState({
      token: "jwt",
      user: { id: "u2", email: "fedesanna@example.com", created_at: 0, last_login_at: null, onboarding_completed: false, nome: null, cognome: null, ruolo_professionale: null, terms_accepted_at: null },
    });
    render(wrap(<CollabAvatars />));
    // "fedesanna" → "FE"
    expect(screen.getByTestId("topbar-collab")).toHaveTextContent("FE");
  });
});
