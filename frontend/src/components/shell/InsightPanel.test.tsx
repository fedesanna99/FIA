/**
 * InsightPanel.test.tsx (Precision v2.0) — tone variants + items + action.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { InsightPanel } from "./InsightPanel";

describe("InsightPanel", () => {
  it("renders title with default tone=info border-l-accent", () => {
    const { container } = render(<InsightPanel title="Insight title" />);
    const panel = screen.getByTestId("insight-panel");
    expect(panel).toBeInTheDocument();
    expect(panel.getAttribute("data-tone")).toBe("info");
    expect(panel.className).toContain("border-l-accent");
    expect(container.querySelector("h3")?.textContent).toBe("Insight title");
  });

  it("applies correct border-l per tone", () => {
    const { rerender } = render(<InsightPanel title="t" tone="success" />);
    expect(screen.getByTestId("insight-panel").className).toContain("border-l-success");
    rerender(<InsightPanel title="t" tone="warn" />);
    expect(screen.getByTestId("insight-panel").className).toContain("border-l-warn");
    rerender(<InsightPanel title="t" tone="danger" />);
    expect(screen.getByTestId("insight-panel").className).toContain("border-l-danger");
  });

  it("renders eyebrow uppercase mono", () => {
    render(<InsightPanel title="t" eyebrow="CRITICAL ELEMENT" />);
    const eyebrow = screen.getByText("CRITICAL ELEMENT");
    expect(eyebrow.className).toContain("uppercase");
    expect(eyebrow.className).toContain("font-mono");
  });

  it("renders items list with stagger animation-delay", () => {
    const { container } = render(
      <InsightPanel
        title="t"
        items={[
          { text: "First item" },
          { text: "Second item" },
        ]}
      />,
    );
    expect(screen.getByText("First item")).toBeInTheDocument();
    expect(screen.getByText("Second item")).toBeInTheDocument();
    const items = container.querySelectorAll("li");
    expect(items.length).toBe(2);
    // stagger animationDelay applied inline
    expect((items[1] as HTMLElement).style.animationDelay).toBe("60ms");
  });

  it("action.onClick fires when button variant clicked", () => {
    const onClick = vi.fn();
    render(
      <InsightPanel
        title="t"
        action={{ label: "Vai al dettaglio", onClick }}
      />,
    );
    fireEvent.click(screen.getByTestId("insight-panel-action"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("action.href renders as <a> link", () => {
    const { container } = render(
      <InsightPanel
        title="t"
        action={{ label: "Vai", href: "/details" }}
      />,
    );
    const a = container.querySelector("a");
    expect(a).toBeTruthy();
    expect(a?.getAttribute("href")).toBe("/details");
  });
});
