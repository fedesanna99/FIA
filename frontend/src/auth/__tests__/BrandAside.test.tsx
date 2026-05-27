/**
 * Test BrandAside · v2.7.0 Phase 4.1 mockup-driven (F.2.4).
 *
 * Verifica composition-level del left aside auth:
 *   1. Brand mark (FEA Pro + FEM Web Studio)
 *   2. Manifesto eyebrow + 4-line brand-claim + sub
 *   3. BrandDiagramSVG render (linearGradient `stress` + path beam)
 *   4. Brand stats 62/5/1244 (sezione + separatori)
 *   5. Cambia lingua placeholder no-op (preventDefault)
 *
 * Rendering test usa jsdom; non verifichiamo styling reale (CSS) — solo
 * struttura DOM + content text. Lo smoke E2E (F.8) coprirà il visual.
 */
import { render, screen, within } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BrandAside } from "../BrandAside";

describe("BrandAside · composition", () => {
  it("test 1 · brand mark render with FEA Pro + FEM Web Studio", () => {
    render(<BrandAside />);
    expect(screen.getByText("FEA Pro")).toBeInTheDocument();
    expect(screen.getByText("FEM Web Studio")).toBeInTheDocument();
    // Brand square ha la "F" mark
    const aside = screen.getByTestId("auth-brand-aside");
    expect(within(aside).getByText("F")).toBeInTheDocument();
  });

  it("test 2 · manifesto eyebrow + 4-line brand-claim + sub", () => {
    render(<BrandAside />);
    expect(screen.getByText("Manifesto · v2.3.7")).toBeInTheDocument();
    // brand-claim contiene "algoritmo" e "onestà" come <b>
    expect(screen.getByText("algoritmo")).toBeInTheDocument();
    expect(screen.getByText("onestà")).toBeInTheDocument();
    // brand-sub (substring match perché contiene &nbsp; e dash)
    expect(screen.getByText(/Modella · analizza · verifica strutture nel browser/)).toBeInTheDocument();
    expect(screen.getByText(/normative EC2\/3\/5\/8/)).toBeInTheDocument();
  });

  it("test 3 · BrandDiagramSVG render with stress gradient + beam path", () => {
    const { container } = render(<BrandAside />);
    // SVG presente
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    // linearGradient con id="stress" (5 stop di colore Eurocodice)
    const gradient = container.querySelector("linearGradient#stress");
    expect(gradient).toBeInTheDocument();
    expect(gradient?.querySelectorAll("stop").length).toBe(5);
    // Annotation della freccia δ
    expect(screen.getByText("δ = 9.61 mm")).toBeInTheDocument();
    // Annotation della luce L
    expect(screen.getByText(/L = 6\.00 m · IPE 300 · S355/)).toBeInTheDocument();
    // Carico distribuito q
    expect(screen.getByText("q = 10.0 kN/m")).toBeInTheDocument();
  });

  it("test 4 · brand stats 62/5/1244 con 2 separatori", () => {
    render(<BrandAside />);
    const stats = screen.getByTestId("brand-stats");
    // 3 stat values
    expect(within(stats).getByText("62")).toBeInTheDocument();
    expect(within(stats).getByText("5")).toBeInTheDocument();
    expect(within(stats).getByText("1244")).toBeInTheDocument();
    // 3 stat labels
    expect(within(stats).getByText("endpoint REST")).toBeInTheDocument();
    expect(within(stats).getByText("Eurocodici")).toBeInTheDocument();
    expect(within(stats).getByText("test passing")).toBeInTheDocument();
    // 2 separatori .stat-sep (uno tra ogni coppia)
    const separators = stats.querySelectorAll(".stat-sep");
    expect(separators.length).toBe(2);
  });

  it("test 5 · cambia lingua placeholder no-op (preventDefault)", () => {
    render(<BrandAside />);
    const link = screen.getByTestId("auth-i18n-placeholder");
    expect(link).toHaveTextContent("Cambia lingua · IT");
    expect(link).toHaveAttribute("title", "i18n in arrivo v3.x");
    // Click → preventDefault (URL non cambia, niente navigazione)
    const event = new MouseEvent("click", { bubbles: true, cancelable: true });
    const prevented = !link.dispatchEvent(event);
    expect(prevented).toBe(true);
    // Backup: anche tramite fireEvent (assert no navigation success)
    fireEvent.click(link);
    expect(window.location.hash).toBe("");
  });
});
