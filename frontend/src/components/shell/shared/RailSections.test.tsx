// v2.6.6 E.2 · RailSections shared component tests.
//
// Componente pure presentational (no store side-effect). Test pattern:
// monta con props mockate e verifica rendering + callback chiamati.
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RailSections } from "./RailSections";
import { findRailItem, getAllRailItems } from "../../../lib/railConfig";

describe("RailSections (v2.6.6 E.2 shared)", () => {
  it("renders 4 sections in order WORKSPACE/SOLVE/VERIFY/RISORSE", () => {
    render(<RailSections onItemClick={vi.fn()} onCollapse={vi.fn()} />);
    expect(screen.getByTestId("rail-section-WORKSPACE")).toBeInTheDocument();
    expect(screen.getByTestId("rail-section-SOLVE")).toBeInTheDocument();
    expect(screen.getByTestId("rail-section-VERIFY")).toBeInTheDocument();
    expect(screen.getByTestId("rail-section-RISORSE")).toBeInTheDocument();
  });

  it("renders all 12 items from railConfig", () => {
    render(<RailSections onItemClick={vi.fn()} onCollapse={vi.fn()} />);
    const items = getAllRailItems();
    expect(items).toHaveLength(12);
    for (const item of items) {
      expect(screen.getByTestId(`rail-item-${item.id}`)).toBeInTheDocument();
    }
  });

  it("calls onItemClick with the RailItem when a button is clicked", () => {
    const handleClick = vi.fn();
    render(<RailSections onItemClick={handleClick} onCollapse={vi.fn()} />);
    fireEvent.click(screen.getByTestId("rail-item-linear"));
    expect(handleClick).toHaveBeenCalledTimes(1);
    expect(handleClick.mock.calls[0][0]).toEqual(findRailItem("linear"));
  });

  it("active item highlight via data-active='true' (aria-current=page)", () => {
    render(
      <RailSections
        activeItemId="checks"
        onItemClick={vi.fn()}
        onCollapse={vi.fn()}
      />,
    );
    const active = screen.getByTestId("rail-item-checks");
    expect(active.getAttribute("data-active")).toBe("true");
    expect(active.getAttribute("aria-current")).toBe("page");

    const inactive = screen.getByTestId("rail-item-home");
    expect(inactive.getAttribute("data-active")).toBeNull();
  });

  it("calls onCollapse when 'Comprimi' button clicked", () => {
    const handleCollapse = vi.fn();
    render(<RailSections onItemClick={vi.fn()} onCollapse={handleCollapse} />);
    fireEvent.click(screen.getByTestId("rail-collapse-toggle"));
    expect(handleCollapse).toHaveBeenCalledTimes(1);
  });

  it("renders custom collapseLabel when provided", () => {
    render(
      <RailSections
        onItemClick={vi.fn()}
        onCollapse={vi.fn()}
        collapseLabel="Riduci"
      />,
    );
    expect(screen.getByText("Riduci")).toBeInTheDocument();
  });

  it("applies className prop to nav wrapper", () => {
    const { container } = render(
      <RailSections
        onItemClick={vi.fn()}
        onCollapse={vi.fn()}
        className="shell-rail legacy-left-rail"
      />,
    );
    const nav = container.querySelector("nav");
    expect(nav?.className).toContain("rail-sections");
    expect(nav?.className).toContain("shell-rail");
    expect(nav?.className).toContain("legacy-left-rail");
  });

  it("data-shell='rail' and data-expanded='true' on nav (smoke marker)", () => {
    const { container } = render(
      <RailSections onItemClick={vi.fn()} onCollapse={vi.fn()} />,
    );
    const nav = container.querySelector("nav");
    expect(nav?.getAttribute("data-shell")).toBe("rail");
    expect(nav?.getAttribute("data-expanded")).toBe("true");
  });
});
