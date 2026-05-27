/**
 * Test OTPInput · v2.7.0 Phase 4.1 mockup-driven (F.7 sub).
 *
 * Verifica 6-cells single-char + auto-advance + backspace + a11y.
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { OTPInput } from "../components/OTPInput";


function ControlledOTP({ onChange }: { onChange?: (v: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <OTPInput
      value={value}
      onChange={(v) => {
        setValue(v);
        onChange?.(v);
      }}
    />
  );
}


describe("OTPInput · 6 cells default", () => {
  it("test 1 · render 6 cells con aria-label e inputMode numeric", () => {
    render(<ControlledOTP />);
    const cells = screen.getAllByTestId(/^auth-otp-cell-/);
    expect(cells).toHaveLength(6);
    expect(cells[0]).toHaveAttribute("aria-label", "Cifra 1 di 6");
    expect(cells[5]).toHaveAttribute("aria-label", "Cifra 6 di 6");
    expect(cells[0]).toHaveAttribute("inputMode", "numeric");
    expect(cells[0]).toHaveAttribute("pattern", "[0-9]*");
    expect(cells[0]).toHaveAttribute("maxLength", "1");
  });

  it("test 2 · auto-advance: type su cell 0 → focus cell 1", async () => {
    const user = userEvent.setup();
    render(<ControlledOTP />);
    const cells = screen.getAllByTestId(/^auth-otp-cell-/);
    await user.click(cells[0]);
    await user.keyboard("8");
    expect(cells[1]).toHaveFocus();
    await user.keyboard("2");
    expect(cells[2]).toHaveFocus();
  });

  it("test 3 · backspace su cell vuoto → focus prev", async () => {
    const user = userEvent.setup();
    render(<ControlledOTP />);
    const cells = screen.getAllByTestId(/^auth-otp-cell-/);
    await user.click(cells[0]);
    await user.keyboard("82");
    expect(cells[2]).toHaveFocus(); // dopo "8" e "2", focus su cell 2 vuota
    // Backspace su cell 2 (vuota) → torna a cell 1
    await user.keyboard("{Backspace}");
    expect(cells[1]).toHaveFocus();
  });

  it("test 4 · onChange chiamato con joined value cumulativo", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<ControlledOTP onChange={onChange} />);
    const cells = screen.getAllByTestId(/^auth-otp-cell-/);
    await user.click(cells[0]);
    await user.keyboard("123");
    // Ultimo onChange call dovrebbe avere "123"
    expect(onChange).toHaveBeenLastCalledWith("123");
  });
});
