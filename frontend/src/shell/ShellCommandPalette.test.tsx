// v2.6.2 Shell · ShellCommandPalette tests
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ShellCommandPalette } from "./ShellCommandPalette";
import { useWorkspaceStore } from "../store/workspaceStore";

describe("ShellCommandPalette", () => {
  beforeEach(() => {
    useWorkspaceStore.getState().setPalette(false);
  });

  it("does not render content when palette closed", () => {
    render(<ShellCommandPalette />);
    expect(screen.queryByTestId("shell-command-palette")).not.toBeInTheDocument();
  });

  it("renders modal content when palette open", () => {
    useWorkspaceStore.getState().setPalette(true);
    render(<ShellCommandPalette />);
    expect(screen.getByTestId("shell-command-palette")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/cerca azioni/i)).toBeInTheDocument();
  });
});
