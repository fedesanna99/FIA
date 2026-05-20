import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { VerificationPanel } from "./VerificationPanel";
import { useModelStore } from "../../store/modelStore";

vi.mock("../../api/client", () => ({
  verifyApi: {
    ec3: vi.fn(),
  },
}));

import { verifyApi } from "../../api/client";


function renderWithQuery() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <VerificationPanel />
    </QueryClientProvider>,
  );
}


const SAMPLE_MODEL = {
  id: "test_model",
  name: "test",
  is_3d: false,
  nodes: [],
  elements: [],
  loads: [],
  constraints: [],
};


describe("VerificationPanel", () => {
  beforeEach(() => {
    act(() => {
      useModelStore.setState({
        model: null,
        selectedNodeIds: new Set(),
        selectedElementIds: new Set(),
      });
    });
    vi.clearAllMocks();
  });

  it("mostra messaggio se nessun modello caricato", () => {
    renderWithQuery();
    expect(screen.getByText(/Nessun modello caricato/i)).toBeInTheDocument();
  });

  it("renderizza i campi γ_M0/γ_M1 e il bottone quando c'è un modello", () => {
    act(() => {
      useModelStore.setState({ model: SAMPLE_MODEL as never });
    });
    renderWithQuery();
    expect(screen.getByText(/Verifica EC3/i)).toBeInTheDocument();
    expect(screen.getByText("γ_M0")).toBeInTheDocument();
    expect(screen.getByText("γ_M1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Esegui verifica/i })).toBeInTheDocument();
  });

  it("chiama l'API e mostra i risultati al click sul bottone", async () => {
    act(() => {
      useModelStore.setState({ model: SAMPLE_MODEL as never });
    });
    (verifyApi.ec3 as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      model_id: "test_model",
      n_elements_checked: 2,
      n_failures: 1,
      results: [
        {
          element_id: 1, section_id: "ipe_300", material_id: "steel_s355",
          L: 3.0, section_class: 1,
          N_Ed: 0, M_Ed: 50e3, V_Ed: 5e3,
          N_Rd: 1819e3, M_c_Rd: 212e3, V_c_Rd: 500e3,
          N_b_Rd: null, M_b_Rd: 180e3,
          UR_resistance: 0.236, UR_buckling: null, UR_LTB: 0.278,
          UR_serviceability: null,
          UR_max: 0.278, governing: "LTB", status: "OK", notes: "class C1",
        },
        {
          element_id: 2, section_id: "ipe_300", material_id: "steel_s355",
          L: 3.0, section_class: 1,
          N_Ed: 0, M_Ed: 250e3, V_Ed: 50e3,
          N_Rd: 1819e3, M_c_Rd: 212e3, V_c_Rd: 500e3,
          N_b_Rd: null, M_b_Rd: 180e3,
          UR_resistance: 1.179, UR_buckling: null, UR_LTB: 1.389,
          UR_serviceability: null,
          UR_max: 1.389, governing: "LTB", status: "FAIL", notes: "class C1",
        },
      ],
    });

    const user = userEvent.setup();
    renderWithQuery();
    await user.click(screen.getByRole("button", { name: /Esegui verifica/i }));

    await waitFor(() => {
      expect(verifyApi.ec3).toHaveBeenCalledWith("test_model", {
        gamma_M0: 1.05, gamma_M1: 1.05,
      });
      // UR formattati a 3 decimali (univoci)
      expect(screen.getByText("0.278")).toBeInTheDocument();
      expect(screen.getByText("1.389")).toBeInTheDocument();
    });
    // Conteggi: 2 elementi, 1 failure
    expect(screen.getByText(/Elementi verificati:/i)).toBeInTheDocument();
    expect(screen.getByText(/Failures:/i)).toBeInTheDocument();
  });

  it("apre il modale dettagli al click su una riga", async () => {
    act(() => {
      useModelStore.setState({ model: SAMPLE_MODEL as never });
    });
    (verifyApi.ec3 as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      model_id: "test_model",
      n_elements_checked: 1,
      n_failures: 0,
      results: [{
        element_id: 42, section_id: "heb_300", material_id: "steel_s275",
        L: 4.0, section_class: 1,
        N_Ed: 100e3, M_Ed: 30e3, V_Ed: 10e3,
        N_Rd: 4100e3, M_c_Rd: 490e3, V_c_Rd: 600e3,
        N_b_Rd: 3047e3, M_b_Rd: null,
        UR_resistance: 0.085, UR_buckling: 0.033, UR_LTB: null,
        UR_serviceability: null,
        UR_max: 0.085, governing: "resistance", status: "OK", notes: "class C1",
      }],
    });

    const user = userEvent.setup();
    renderWithQuery();
    await user.click(screen.getByRole("button", { name: /Esegui verifica/i }));
    // attendi la riga della tabella
    await waitFor(() => expect(screen.getByText(/resistance/i)).toBeInTheDocument());

    // Click sulla cella ID (univoca) per aprire il modale
    await user.click(screen.getByText("42"));
    // Il modale dettagli mostra il titolo composto
    expect(screen.getByText(/Elemento 42/i)).toBeInTheDocument();
    // Chiudi modale
    await user.click(screen.getByRole("button", { name: /Chiudi/i }));
    await waitFor(() =>
      expect(screen.queryByText(/Elemento 42/i)).not.toBeInTheDocument(),
    );
  });

  it("permette di modificare γ_M0 e usa il nuovo valore nella chiamata", async () => {
    act(() => {
      useModelStore.setState({ model: SAMPLE_MODEL as never });
    });
    (verifyApi.ec3 as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      model_id: "test_model",
      n_elements_checked: 0, n_failures: 0, results: [],
    });

    const user = userEvent.setup();
    renderWithQuery();
    const inputs = screen.getAllByDisplayValue("1.05");
    expect(inputs).toHaveLength(2);  // γ_M0 e γ_M1
    const gm0 = inputs[0] as HTMLInputElement; // primo input = γ_M0
    fireEvent.change(gm0, { target: { value: "1" } });
    await user.click(screen.getByRole("button", { name: /Esegui verifica/i }));

    await waitFor(() => {
      expect(verifyApi.ec3).toHaveBeenCalledWith("test_model", {
        gamma_M0: 1, gamma_M1: 1.05,
      });
    });
  });
});
