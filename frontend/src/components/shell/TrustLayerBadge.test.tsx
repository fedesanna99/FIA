/**
 * TrustLayerBadge.test.tsx (Precision v2.0) — variants smoke.
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TrustLayerBadge } from "./TrustLayerBadge";

describe("TrustLayerBadge", () => {
  it("renders inline draft chip by default", () => {
    render(<TrustLayerBadge />);
    expect(screen.getByTestId("trust-badge-inline-draft")).toBeInTheDocument();
    expect(screen.getByText(/DRAFT/i)).toBeInTheDocument();
  });

  it("renders inline signed chip when qualifiedBy set", () => {
    render(<TrustLayerBadge qualifiedBy="Ing. Mario Rossi · OdI Roma A1234" />);
    expect(screen.getByTestId("trust-badge-inline-signed")).toBeInTheDocument();
    expect(screen.getByText(/firmato/i)).toBeInTheDocument();
  });

  it("renders banner draft variant with role=note", () => {
    render(<TrustLayerBadge variant="banner" />);
    expect(screen.getByTestId("trust-banner-draft")).toBeInTheDocument();
    expect(screen.getByRole("note")).toHaveAttribute("aria-label", "Trust Layer · Draft");
  });

  it("renders banner signed when qualifiedBy + variant banner", () => {
    render(<TrustLayerBadge variant="banner" qualifiedBy="Ing. Mario Rossi" />);
    expect(screen.getByTestId("trust-banner-signed")).toBeInTheDocument();
    expect(screen.getByRole("note")).toHaveAttribute("aria-label", "Report firmato");
  });

  it("renders watermark variant as aria-hidden SVG overlay", () => {
    const { container } = render(<TrustLayerBadge variant="watermark" />);
    expect(container.querySelector("[data-testid='trust-watermark']")).toBeTruthy();
    expect(container.querySelector("svg")).toBeTruthy();
    // watermark deve avere aria-hidden così non interferisce con screen reader
    expect(container.querySelector("[data-testid='trust-watermark']"))
      .toHaveAttribute("aria-hidden", "true");
  });
});
