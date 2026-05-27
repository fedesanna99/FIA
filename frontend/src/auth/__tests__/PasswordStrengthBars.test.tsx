/**
 * Test PasswordStrengthBars · v2.7.0 Phase 4.1 mockup-driven (F.5 sub).
 *
 * Verifica compute + render del 4-level indicator. Brief decisione 11
 * thresholds:
 *
 *   weak    < 8 char
 *   ok      8-11 char con 0-1 class
 *   good    8-11 char con ≥2 class  OR  ≥12 char con qualsiasi class
 *   strong  ≥12 char e ≥3 class
 *
 * (class ∈ {upper, number, special})
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  PasswordStrengthBars,
  computePasswordStrength,
} from "../components/PasswordStrengthBars";


describe("computePasswordStrength · 4-level logic", () => {
  it("test 1 · weak per password < 8 char", () => {
    expect(computePasswordStrength("")).toBe("weak");
    expect(computePasswordStrength("abc")).toBe("weak");
    expect(computePasswordStrength("1234567")).toBe("weak"); // 7 char
  });

  it("test 2 · ok per 8-11 char senza diversità", () => {
    expect(computePasswordStrength("password")).toBe("ok"); // 8 char, lowercase only
    expect(computePasswordStrength("simpletext")).toBe("ok"); // 10 char, lowercase only
  });

  it("test 3 · good per 8-11 char con ≥2 class OR ≥12 char", () => {
    expect(computePasswordStrength("Password1")).toBe("good"); // 9 char, Upper+Number
    expect(computePasswordStrength("Password123")).toBe("good"); // 11 char, Upper+Number
    expect(computePasswordStrength("simplelongpassword")).toBe("good"); // 18 char, 0 class
  });

  it("test 4 · strong per ≥12 char + ≥3 class", () => {
    expect(computePasswordStrength("Password123!XYZ")).toBe("strong"); // 15, U+N+S
    expect(computePasswordStrength("Abc12345!def")).toBe("strong"); // 12, U+N+S
  });
});

describe("PasswordStrengthBars · render", () => {
  it("test 5 · render data-strength attribute reflects compute output", () => {
    const { rerender } = render(<PasswordStrengthBars password="abc" />);
    expect(screen.getByTestId("pw-strength")).toHaveAttribute("data-strength", "weak");
    rerender(<PasswordStrengthBars password="Password123!XYZ" />);
    expect(screen.getByTestId("pw-strength")).toHaveAttribute("data-strength", "strong");
  });

  it("test 6 · label italiana coerente con strength", () => {
    const { rerender } = render(<PasswordStrengthBars password="" />);
    expect(screen.getByText("Troppo debole")).toBeInTheDocument();
    rerender(<PasswordStrengthBars password="password" />);
    expect(screen.getByText("Sufficiente")).toBeInTheDocument();
    rerender(<PasswordStrengthBars password="Password123" />);
    expect(screen.getByText("Buona")).toBeInTheDocument();
    rerender(<PasswordStrengthBars password="Password123!XYZ" />);
    expect(screen.getByText("Robusta · ottima scelta")).toBeInTheDocument();
  });
});
