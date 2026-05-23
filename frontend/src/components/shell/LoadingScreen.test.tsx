/**
 * LoadingScreen.test.tsx (Precision v2.0 PR8).
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LoadingScreen, SOLVER_PHASES } from "./LoadingScreen";

describe("LoadingScreen", () => {
  it("renderizza heading 'Solver attivo' e role=status", () => {
    render(<LoadingScreen phase="validation" />);
    expect(screen.getByText("Solver attivo")).toBeInTheDocument();
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("aria-busy=true e aria-live=polite", () => {
    const { container } = render(<LoadingScreen phase="solve" />);
    const root = container.querySelector('[role="status"]') as HTMLElement;
    expect(root.getAttribute("aria-busy")).toBe("true");
    expect(root.getAttribute("aria-live")).toBe("polite");
  });

  it("renderizza tutte le 6 fasi", () => {
    render(<LoadingScreen phase="assembly" />);
    expect(SOLVER_PHASES).toHaveLength(6);
    for (const p of SOLVER_PHASES) {
      expect(screen.getByTestId(`phase-${p.id}`)).toBeInTheDocument();
    }
  });

  it("phase corrente ha data-state=active", () => {
    render(<LoadingScreen phase="assembly" />);
    const active = screen.getByTestId("phase-assembly");
    expect(active.getAttribute("data-state")).toBe("active");
  });

  it("phase precedenti hanno data-state=done", () => {
    render(<LoadingScreen phase="assembly" />);
    const done = screen.getByTestId("phase-validation");
    expect(done.getAttribute("data-state")).toBe("done");
  });

  it("phase successive hanno data-state=queued", () => {
    render(<LoadingScreen phase="assembly" />);
    const queued = screen.getByTestId("phase-postprocess");
    expect(queued.getAttribute("data-state")).toBe("queued");
  });

  it("progress > 0 mostra progress bar determinate con width %", () => {
    render(<LoadingScreen phase="solve" progress={0.42} />);
    const bar = screen.getByTestId("loading-progress-bar") as HTMLElement;
    expect(bar.style.width).toBe("42%");
  });

  it("progress=0 mostra animate-indeterminate", () => {
    const { container } = render(<LoadingScreen phase="validation" progress={0} />);
    expect(container.querySelector(".animate-indeterminate")).toBeInTheDocument();
  });

  it("etaSeconds formatta < 60s come 'N s'", () => {
    render(<LoadingScreen phase="solve" progress={0.5} etaSeconds={42} />);
    expect(screen.getByText("ETA 42 s")).toBeInTheDocument();
  });

  it("etaSeconds formatta >= 60s come 'Nm Xs'", () => {
    render(<LoadingScreen phase="solve" progress={0.5} etaSeconds={75} />);
    expect(screen.getByText("ETA 1m 15s")).toBeInTheDocument();
  });

  it("logs mostra l'ultima riga", () => {
    render(<LoadingScreen phase="solve" logs={["foo", "bar", "baz"]} />);
    expect(screen.getByTestId("loading-log-stream")).toBeInTheDocument();
    expect(screen.getByText("baz")).toBeInTheDocument();
  });

  it("logs vuoti → log-stream non renderizzato", () => {
    render(<LoadingScreen phase="solve" logs={[]} />);
    expect(screen.queryByTestId("loading-log-stream")).toBeNull();
  });

  it("logs cap a ultime 20 righe", () => {
    const many = Array.from({ length: 30 }, (_, i) => `line ${i}`);
    render(<LoadingScreen phase="solve" logs={many} />);
    // line 0..9 NON visibili
    expect(screen.queryByText("line 0")).toBeNull();
    // line 29 visibile (ultima)
    expect(screen.getByText("line 29")).toBeInTheDocument();
    // line 10 visibile (prima delle ultime 20)
    expect(screen.getByText("line 10")).toBeInTheDocument();
  });

  it("subtitle se passato è mostrato", () => {
    render(<LoadingScreen phase="solve" subtitle="Statica · Trave demo" />);
    expect(screen.getByText("Statica · Trave demo")).toBeInTheDocument();
  });

  it("phase=null → tutte le fasi sono queued", () => {
    render(<LoadingScreen phase={null} />);
    for (const p of SOLVER_PHASES) {
      expect(screen.getByTestId(`phase-${p.id}`).getAttribute("data-state")).toBe("queued");
    }
  });
});
