import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ModelInfoCard } from "./ModelInfoCard";
import { useModelStore } from "../../store/modelStore";

const fakeModel = (overrides: Record<string, unknown> = {}) =>
  ({
    id: "m1",
    name: "Telaio portale 2D",
    nodes: [{}, {}, {}, {}],
    elements: [{}, {}, {}],
    constraints: [{}, {}],
    loads: [{}],
    units: "SI",
    is_3d: false,
    ...overrides,
  } as never);

describe("ModelInfoCard", () => {
  it("non renderizza nulla quando model = null", () => {
    useModelStore.setState({ model: null } as never);
    const { container } = render(<ModelInfoCard />);
    expect(container.firstChild).toBeNull();
  });

  it("renderizza nome + counts quando il modello esiste", () => {
    useModelStore.setState({ model: fakeModel() } as never);
    render(<ModelInfoCard />);
    expect(screen.getByTestId("model-info-card")).toBeInTheDocument();
    expect(screen.getByTestId("model-info-name")).toHaveTextContent("Telaio portale 2D");
    const counts = screen.getByTestId("model-info-counts");
    expect(counts).toHaveTextContent(/4 nodi/);
    expect(counts).toHaveTextContent(/3 elementi/);
    expect(counts).toHaveTextContent(/2 vincoli/);
    expect(counts).toHaveTextContent(/1 carichi/);
  });

  it("mostra 3D vs 2D + units", () => {
    useModelStore.setState({ model: fakeModel({ is_3d: true, units: "N-mm" }) } as never);
    render(<ModelInfoCard />);
    expect(screen.getByText(/3D · N-mm/i)).toBeInTheDocument();
  });
});
