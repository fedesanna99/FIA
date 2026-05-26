// v2.6.2 Shell · ShellRail tests
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ShellRail } from "./ShellRail";

describe("ShellRail", () => {
  it("renders 5 workspace buttons + auto-detect + docs + settings", () => {
    render(<ShellRail />);
    expect(screen.getByTestId("rail-modello")).toBeInTheDocument();
    expect(screen.getByTestId("rail-analisi")).toBeInTheDocument();
    expect(screen.getByTestId("rail-risultati")).toBeInTheDocument();
    expect(screen.getByTestId("rail-verifiche")).toBeInTheDocument();
    expect(screen.getByTestId("rail-io")).toBeInTheDocument();
    expect(screen.getByTestId("rail-autodetect")).toBeInTheDocument();
    expect(screen.getByTestId("rail-docs")).toBeInTheDocument();
    expect(screen.getByTestId("rail-settings")).toBeInTheDocument();
  });

  it("active workspace gets .active className", () => {
    render(<ShellRail active="analisi" />);
    const analisiBtn = screen.getByTestId("rail-analisi");
    expect(analisiBtn.className).toContain("active");
    const modelloBtn = screen.getByTestId("rail-modello");
    expect(modelloBtn.className).not.toContain("active");
  });

  it("clicking a workspace button calls onChange", () => {
    const onChange = vi.fn();
    render(<ShellRail onChange={onChange} />);
    fireEvent.click(screen.getByTestId("rail-risultati"));
    expect(onChange).toHaveBeenCalledWith("risultati");
  });
});
