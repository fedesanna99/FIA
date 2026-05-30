/**
 * Test PercorsiGalleryPage · v3.5 Fetta D2 (30/05/2026)
 *
 * Smoke test della galleria "Choose a path":
 *   - render header + breadcrumb + active escape
 *   - 3 card percorsi presenti (Verifica Telaio 2D promoted + UC1 + ComingSoon)
 *   - card Promoted ha badge visibile
 *   - card ComingSoon è disabled (no href Link)
 *   - sidebar dx ha 4 card (Credits + Persona + Copilot + Tips)
 *   - footer ha 4 pillole filosofiche
 *   - link card naviga a route corretta
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { PercorsiGalleryPage } from "./PercorsiGalleryPage";


function renderPage() {
  return render(
    <MemoryRouter>
      <PercorsiGalleryPage />
    </MemoryRouter>,
  );
}


describe("PercorsiGalleryPage · D2 galleria", () => {
  it("renderizza il container + hero 'Choose a path'", () => {
    renderPage();
    expect(screen.getByTestId("percorsi-gallery-page")).toBeInTheDocument();
    const hero = screen.getByTestId("pgall-hero");
    expect(hero.textContent).toContain("PERCORSI GUIDATI");
    expect(hero.textContent).toContain("Choose a path");
  });

  it("topbar minima: brand + breadcrumb 'Home / Percorsi' + Apri Studio Pro", () => {
    renderPage();
    expect(screen.getByTestId("pgall-brand-home")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^home$/i })).toBeInTheDocument();
    // "Percorsi" è il breadcrumb corrente (span, non link)
    expect(screen.getByText("Percorsi", { selector: ".pgall-bc-now" })).toBeInTheDocument();
    expect(screen.getByTestId("pgall-open-studio-pro")).toBeInTheDocument();
  });

  it("3 card percorsi: Verifica Telaio 2D (promoted) + UC1 + Import IFC/DXF (coming soon)", () => {
    renderPage();
    expect(screen.getByTestId("pgall-card-verifica-telaio-2d")).toBeInTheDocument();
    expect(screen.getByTestId("pgall-card-trave-uc1")).toBeInTheDocument();
    expect(screen.getByTestId("pgall-card-import-ifc-dxf")).toBeInTheDocument();
  });

  it("Verifica Telaio 2D ha badge 'Promoted' visibile", () => {
    renderPage();
    const card = screen.getByTestId("pgall-card-verifica-telaio-2d");
    expect(card.className).toContain("is-promoted");
    expect(card.textContent).toContain("Promoted");
  });

  it("Verifica Telaio 2D è un <Link> con href = /percorsi/telaio-2d", () => {
    renderPage();
    const card = screen.getByTestId("pgall-card-verifica-telaio-2d");
    expect(card.tagName.toLowerCase()).toBe("a");
    expect(card.getAttribute("href")).toBe("/percorsi/telaio-2d");
  });

  it("Import IFC/DXF è disabled (NON link, classe is-coming-soon, aria-disabled)", () => {
    renderPage();
    const card = screen.getByTestId("pgall-card-import-ifc-dxf");
    expect(card.tagName.toLowerCase()).toBe("div");
    expect(card.className).toContain("is-coming-soon");
    expect(card.getAttribute("aria-disabled")).toBe("true");
    expect(card.textContent).toContain("Disponibile presto");
  });

  it("sidebar dx: 4 card (Credits 47/100 + Persona + AI Copilot + Tips)", () => {
    renderPage();
    const credits = screen.getByTestId("pgall-side-credits");
    expect(credits.textContent).toContain("47");
    expect(credits.textContent).toContain("100");
    expect(screen.getByTestId("pgall-side-persona")).toBeInTheDocument();
    expect(screen.getByTestId("pgall-side-copilot")).toBeInTheDocument();
    expect(screen.getByTestId("pgall-side-copilot").textContent).toContain("v1.10");
    expect(screen.getByTestId("pgall-side-tips")).toBeInTheDocument();
  });

  it("footer pillole: 4 pillole filosofiche", () => {
    renderPage();
    const footer = screen.getByTestId("pgall-footer");
    expect(footer.textContent).toContain("Cos'è Percorsi?");
    expect(footer.textContent).toContain("Step-by-step");
    expect(footer.textContent).toContain("Algorithmic guidance");
    expect(footer.textContent).toContain("Always in control");
  });
});
