/**
 * Avatar.test.tsx (Precision v2.0 PR6) — initials + hash deterministico.
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Avatar } from "./Avatar";

describe("Avatar", () => {
  it("estrae 2 iniziali da nome+cognome separati da spazio", () => {
    render(<Avatar name="Federico Sanna" />);
    expect(screen.getByText("FS")).toBeInTheDocument();
  });

  it("estrae 2 iniziali da email tipo nome.cognome@dom.com", () => {
    render(<Avatar name="ada.lovelace@example.com" />);
    expect(screen.getByText("AL")).toBeInTheDocument();
  });

  it("nome single-word -> primi 2 char in maiuscolo", () => {
    render(<Avatar name="anonymous" />);
    expect(screen.getByText("AN")).toBeInTheDocument();
  });

  it("string vuota -> placeholder '·'", () => {
    render(<Avatar name="" />);
    expect(screen.getByText("·")).toBeInTheDocument();
  });

  it("hash tone è deterministico (stesso nome → stesso tone)", () => {
    const { container: a } = render(<Avatar name="Mario Rossi" />);
    const { container: b } = render(<Avatar name="Mario Rossi" />);
    const ca = (a.firstChild as HTMLElement).className;
    const cb = (b.firstChild as HTMLElement).className;
    expect(ca).toBe(cb);
  });

  it("tone esplicito override hash", () => {
    const { container } = render(<Avatar name="X" tone="info" />);
    expect((container.firstChild as HTMLElement).className).toContain("bg-bg-info");
  });

  it("size lg applica w-9 h-9", () => {
    const { container } = render(<Avatar name="X" size="lg" />);
    expect((container.firstChild as HTMLElement).className).toContain("w-9");
  });

  it("aria-label e title contengono il nome", () => {
    const { container } = render(<Avatar name="Test User" />);
    const el = container.firstChild as HTMLElement;
    expect(el.getAttribute("aria-label")).toBe("Test User");
    expect(el.getAttribute("title")).toBe("Test User");
  });

  it("ha rounded-full (eccezione Precision per cerchi)", () => {
    const { container } = render(<Avatar name="X" />);
    expect((container.firstChild as HTMLElement).className).toContain("rounded-full");
  });
});
