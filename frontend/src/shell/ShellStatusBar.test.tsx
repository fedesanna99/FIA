// v2.6.2 Shell · ShellStatusBar tests
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ShellStatusBar } from "./ShellStatusBar";

describe("ShellStatusBar", () => {
  it("renders unità and version", () => {
    render(<ShellStatusBar />);
    expect(screen.getByText(/Unità/)).toBeInTheDocument();
    expect(screen.getByText(/SI · kN, m, MPa/)).toBeInTheDocument();
    expect(screen.getByText(/v2\.6/)).toBeInTheDocument();
  });

  it("renders Snap entry", () => {
    render(<ShellStatusBar />);
    expect(screen.getByText("Snap")).toBeInTheDocument();
  });
});
