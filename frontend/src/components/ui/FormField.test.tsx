/**
 * FormField.test.tsx (Precision v2.0 PR6) — label + input + help/error.
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FormField } from "./FormField";

describe("FormField", () => {
  it("renderizza label uppercase mono", () => {
    render(
      <FormField label="Nome modello">
        <input type="text" />
      </FormField>,
    );
    expect(screen.getByText("Nome modello")).toBeInTheDocument();
  });

  it("required mostra asterisco", () => {
    const { container } = render(
      <FormField label="Email" required>
        <input type="email" />
      </FormField>,
    );
    expect(container.querySelector(".text-danger")?.textContent).toContain("*");
  });

  it("required=false NON mostra asterisco", () => {
    const { container } = render(
      <FormField label="Optional">
        <input type="text" />
      </FormField>,
    );
    expect(container.querySelector(".text-danger")).toBeNull();
  });

  it("help mostra hint quando NO error", () => {
    render(
      <FormField label="X" help="Max 64 caratteri">
        <input type="text" />
      </FormField>,
    );
    expect(screen.getByText("Max 64 caratteri")).toBeInTheDocument();
  });

  it("error sostituisce help", () => {
    render(
      <FormField label="X" help="Max 64" error="Campo obbligatorio">
        <input type="text" />
      </FormField>,
    );
    expect(screen.queryByText("Max 64")).toBeNull();
    expect(screen.getByText("Campo obbligatorio")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("inietta id univoco nell'input child", () => {
    const { container } = render(
      <FormField label="X">
        <input type="text" />
      </FormField>,
    );
    const input = container.querySelector("input");
    const label = container.querySelector("label");
    expect(input?.id).toBeTruthy();
    // In HTML l'attributo è `for` (React lo emette in lowercase)
    expect(label?.getAttribute("for")).toBe(input?.id);
  });
});
