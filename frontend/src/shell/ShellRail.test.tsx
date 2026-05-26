// v2.6.2 Shell · ShellRail tests
// v2.6.5 D.1 · refactor per expanded (default) + collapsed fallback per
// mockup Dashboard A1. NB: la persistenza `useRailExpansion` legge da
// localStorage; nei test resettiamo lo stato a "true" (expanded) come
// default, e a "false" per i test collapsed.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ShellRail } from "./ShellRail";

const STORAGE_KEY = "feapro:rail:expanded";

beforeEach(() => {
  // Reset localStorage tra test per evitare leak
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* incognito */
  }
});

describe("ShellRail · expanded mode (default v2.6.5)", () => {
  it("renders 4 text sections per Dashboard A1 mockup", () => {
    render(<ShellRail />);
    // Eyebrow uppercase mono per ogni sezione
    expect(screen.getByText("WORKSPACE")).toBeInTheDocument();
    expect(screen.getByText("SOLVE")).toBeInTheDocument();
    expect(screen.getByText("VERIFY")).toBeInTheDocument();
    expect(screen.getByText("RISORSE")).toBeInTheDocument();
  });

  it("renders 12 rail-item per A1 mockup (Home/Modelli/Jobs/Cronologia + Lineare/Dinamica/Sismica + Risultati/Checks/Report + Template/Docs)", () => {
    render(<ShellRail />);
    expect(screen.getByTestId("rail-item-home")).toBeInTheDocument();
    expect(screen.getByTestId("rail-item-modelli")).toBeInTheDocument();
    expect(screen.getByTestId("rail-item-jobs")).toBeInTheDocument();
    expect(screen.getByTestId("rail-item-cronologia")).toBeInTheDocument();
    expect(screen.getByTestId("rail-item-lineare")).toBeInTheDocument();
    expect(screen.getByTestId("rail-item-dinamica")).toBeInTheDocument();
    expect(screen.getByTestId("rail-item-sismica")).toBeInTheDocument();
    expect(screen.getByTestId("rail-item-risultati")).toBeInTheDocument();
    expect(screen.getByTestId("rail-item-checks")).toBeInTheDocument();
    expect(screen.getByTestId("rail-item-report")).toBeInTheDocument();
    expect(screen.getByTestId("rail-item-template")).toBeInTheDocument();
    expect(screen.getByTestId("rail-item-docs")).toBeInTheDocument();
  });

  it("active workspace marks corresponding rail-item as data-active=true", () => {
    render(<ShellRail active="verifiche" />);
    // Checks è quello che fa setWorkspace verifiche
    expect(screen.getByTestId("rail-item-checks").getAttribute("data-active")).toBe("true");
    // Home (mapped a workspace modello) non è attivo se active=verifiche
    expect(screen.getByTestId("rail-item-home").getAttribute("data-active")).toBeNull();
  });

  it("clicking rail-item-risultati calls onChange with 'risultati'", () => {
    const onChange = vi.fn();
    render(<ShellRail onChange={onChange} />);
    fireEvent.click(screen.getByTestId("rail-item-risultati"));
    expect(onChange).toHaveBeenCalledWith("risultati");
  });

  it("clicking rail-item-checks switches workspace to verifiche", () => {
    const onChange = vi.fn();
    render(<ShellRail onChange={onChange} />);
    fireEvent.click(screen.getByTestId("rail-item-checks"));
    expect(onChange).toHaveBeenCalledWith("verifiche");
  });

  it("clicking rail-item-jobs placeholder dispatches info toast (no onChange)", () => {
    const onChange = vi.fn();
    render(<ShellRail onChange={onChange} />);
    fireEvent.click(screen.getByTestId("rail-item-jobs"));
    // Jobs è placeholder action-only, no workspace switch
    expect(onChange).not.toHaveBeenCalled();
  });

  it("clicking 'Comprimi' switches to collapsed mode (data-expanded=false)", () => {
    const { container } = render(<ShellRail />);
    const nav = container.querySelector(".shell-rail");
    expect(nav?.getAttribute("data-expanded")).toBe("true");
    fireEvent.click(screen.getByTestId("rail-toggle-collapse"));
    expect(container.querySelector(".shell-rail")?.getAttribute("data-expanded")).toBe("false");
  });

  it("expanded mode persists to localStorage", () => {
    render(<ShellRail />);
    fireEvent.click(screen.getByTestId("rail-toggle-collapse"));
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe("false");
  });
});

describe("ShellRail · collapsed fallback (post-Comprimi)", () => {
  beforeEach(() => {
    window.localStorage.setItem(STORAGE_KEY, "false");
  });

  it("renders 5 workspace buttons + auto-detect + docs + settings + expand toggle", () => {
    render(<ShellRail />);
    expect(screen.getByTestId("rail-modello")).toBeInTheDocument();
    expect(screen.getByTestId("rail-analisi")).toBeInTheDocument();
    expect(screen.getByTestId("rail-risultati")).toBeInTheDocument();
    expect(screen.getByTestId("rail-verifiche")).toBeInTheDocument();
    expect(screen.getByTestId("rail-io")).toBeInTheDocument();
    expect(screen.getByTestId("rail-autodetect")).toBeInTheDocument();
    expect(screen.getByTestId("rail-docs")).toBeInTheDocument();
    expect(screen.getByTestId("rail-settings")).toBeInTheDocument();
    expect(screen.getByTestId("rail-toggle-expand")).toBeInTheDocument();
  });

  it("active workspace gets .active className", () => {
    render(<ShellRail active="analisi" />);
    const analisiBtn = screen.getByTestId("rail-analisi");
    expect(analisiBtn.className).toContain("active");
    const modelloBtn = screen.getByTestId("rail-modello");
    expect(modelloBtn.className).not.toContain("active");
  });

  it("clicking a workspace button calls onChange", () => {
    const onChange = vi.fn();
    render(<ShellRail onChange={onChange} />);
    fireEvent.click(screen.getByTestId("rail-risultati"));
    expect(onChange).toHaveBeenCalledWith("risultati");
  });

  it("clicking 'Espandi' toggles back to expanded mode", () => {
    const { container } = render(<ShellRail />);
    expect(container.querySelector(".shell-rail")?.getAttribute("data-expanded")).toBe("false");
    fireEvent.click(screen.getByTestId("rail-toggle-expand"));
    expect(container.querySelector(".shell-rail")?.getAttribute("data-expanded")).toBe("true");
  });
});
