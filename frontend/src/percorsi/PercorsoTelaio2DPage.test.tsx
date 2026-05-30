/**
 * Test PercorsoTelaio2DPage · v3.5 Fetta D1 (30/05/2026)
 *
 * Smoke test minimal per il skeleton della page Demo Slice v1.9.
 * Coverage D1: render header/breadcrumb/active-escape + stepper +
 * navigazione step a step + body placeholder.
 *
 * D3-D7 estendono con test per content reali (form geometry parametrico,
 * vincoli, ecc.).
 */
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { PercorsoTelaio2DPage } from "./PercorsoTelaio2DPage";


function renderPage() {
  return render(
    <MemoryRouter>
      <PercorsoTelaio2DPage />
    </MemoryRouter>,
  );
}


describe("PercorsoTelaio2DPage · D1 skeleton", () => {
  it("renderizza il container page + topbar minima (brand + breadcrumb + open studio)", () => {
    renderPage();
    expect(screen.getByTestId("percorso-telaio-2d-page")).toBeInTheDocument();
    expect(screen.getByTestId("ptd-brand-home")).toBeInTheDocument();
    // v3.5 D4: "Verifica telaio 2D" appare sia in breadcrumb sia in
    // sub-header h1. Scope-limit al breadcrumb tramite selector class.
    expect(screen.getByText("Verifica telaio 2D", { selector: ".ptd-bc-now" })).toBeInTheDocument();
    expect(screen.getByTestId("ptd-open-studio-pro")).toBeInTheDocument();
  });

  it("default step = 1 (Geometry), StepGeometry body montato", () => {
    renderPage();
    // v3.5 D3: step 1 NON e' piu' un placeholder ma StepGeometry vero
    // (form parametrico + preview SVG + aside preset). I test dedicati
    // di StepGeometry coprono la sua logica — qui basta verificare
    // l'integrazione (StepGeometry presente quando step=1).
    expect(screen.getByTestId("step-geometry-body")).toBeInTheDocument();
    expect(screen.getByTestId("step-geometry-preview")).toBeInTheDocument();
    expect(screen.getByTestId("step-geometry-aside")).toBeInTheDocument();
    // Placeholder NON deve essere visibile per step 1
    expect(screen.queryByTestId("ptd-step-1-placeholder")).toBeNull();
  });

  it("active escape 'Apri Studio Pro' ha aria-label corretto", () => {
    renderPage();
    const escape = screen.getByTestId("ptd-open-studio-pro");
    expect(escape.getAttribute("aria-label")).toMatch(/modalità esperto/i);
    expect(escape.getAttribute("href")).toBe("/");
  });

  it("breadcrumb: Home / Percorsi / Verifica telaio 2D", () => {
    renderPage();
    const bc = screen.getByText(/verifica telaio 2d/i, { selector: ".ptd-bc-now" });
    expect(bc).toBeInTheDocument();
    // Link Home + Percorsi presenti
    expect(screen.getByRole("link", { name: /^home$/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^percorsi$/i })).toBeInTheDocument();
  });

  it("navigazione forward: il bottone footer 'Vai a Vincoli' esiste (disabled fino a Done with Geometry)", () => {
    renderPage();
    // v3.5 D3: per step 1, esiste sia il bottone footer "Vai a Vincoli"
    // (PercorsoStep CTA, disabled in pending) sia il bottone interno
    // "Done with Geometry" (StepGeometry submit, sblocca step1Done).
    const forwardBtn = screen.getByRole("button", { name: /vai a vincoli/i });
    expect(forwardBtn).toBeInTheDocument();
    // Submit interno presente
    expect(screen.getByTestId("step-geometry-submit")).toBeInTheDocument();
  });

  it("submit interno step 1 (Done with Geometry) avanza automaticamente a step 2", () => {
    renderPage();
    // Click "Done with Geometry" → handleStep1Submit → setStep(2)
    fireEvent.click(screen.getByTestId("step-geometry-submit"));
    // Step 2 placeholder ora visibile (StepGeometry NON e' piu' renderizzato)
    expect(screen.getByTestId("ptd-step-2-placeholder")).toBeInTheDocument();
    expect(screen.queryByTestId("step-geometry-body")).toBeNull();
  });

  // ── v3.5 D4: sub-header eyebrow visivo + Studio Pro switch polish ──
  it("sub-header eyebrow 'PERCORSO GUIDATO' + titolo 'Verifica telaio 2D'", () => {
    renderPage();
    const subheader = screen.getByTestId("ptd-subheader");
    expect(subheader).toBeInTheDocument();
    expect(subheader.textContent).toContain("PERCORSO GUIDATO");
    expect(subheader.textContent).toContain("Verifica telaio 2D");
  });

  it("auto-save status visibile nel sub-header (verde, sempre on)", () => {
    renderPage();
    const save = screen.getByTestId("ptd-subheader-save");
    expect(save).toBeInTheDocument();
    expect(save.textContent).toContain("Salvataggio automatico");
    expect(save.getAttribute("aria-label")).toMatch(/salvataggio automatico/i);
  });

  it("Apri in Studio Pro pill ha label v3.5 D4 ('Apri in' invece di 'Apri')", () => {
    renderPage();
    expect(screen.getByTestId("ptd-open-studio-pro").textContent).toContain("Apri in Studio Pro");
  });
});
