/**
 * ModelsTable.test.tsx (Precision v2.0) — A2 dashboard tabella + sort/filter.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ModelsTable, type ModelTableRow } from "./ModelsTable";

const ROWS: readonly ModelTableRow[] = [
  { id: "m1", name: "Telaio portale 2D", kind: "2D", nodes: 5,  elements: 4,  ucMax: 0.62, status: "ok",    modifiedAt: "2h fa", ownerName: "Mario Rossi" },
  { id: "m2", name: "Trave appoggiata", kind: "2D", nodes: 3,  elements: 2,  ucMax: 0.92, status: "ok",    modifiedAt: "5h fa", ownerName: "Anna Bianchi" },
  { id: "m3", name: "Edificio shell 3D", kind: "3D", nodes: 220, elements: 412, status: "draft", modifiedAt: "1g fa", ownerName: "Luca Verdi" },
];

describe("ModelsTable", () => {
  it("renders all rows with name + counts", () => {
    render(<ModelsTable rows={ROWS} />);
    expect(screen.getByTestId("models-table")).toBeInTheDocument();
    expect(screen.getByTestId("models-row-m1")).toBeInTheDocument();
    expect(screen.getByTestId("models-row-m2")).toBeInTheDocument();
    expect(screen.getByTestId("models-row-m3")).toBeInTheDocument();
    expect(screen.getByText("Telaio portale 2D")).toBeInTheDocument();
  });

  it("onSelect fires with id on row click", () => {
    const onSelect = vi.fn();
    render(<ModelsTable rows={ROWS} onSelect={onSelect} />);
    fireEvent.click(screen.getByTestId("models-row-m2"));
    expect(onSelect).toHaveBeenCalledWith("m2");
  });

  it("filter input narrows visible rows", () => {
    render(<ModelsTable rows={ROWS} />);
    const filter = screen.getByTestId("models-filter") as HTMLInputElement;
    fireEvent.change(filter, { target: { value: "trave" } });
    // Solo m2 deve restare
    expect(screen.getByTestId("models-row-m2")).toBeInTheDocument();
    expect(screen.queryByTestId("models-row-m1")).toBeNull();
    expect(screen.queryByTestId("models-row-m3")).toBeNull();
  });

  it("filter with no matches shows 'Nessun risultato'", () => {
    render(<ModelsTable rows={ROWS} />);
    const filter = screen.getByTestId("models-filter") as HTMLInputElement;
    fireEvent.change(filter, { target: { value: "xyznomatch" } });
    expect(screen.getByText(/nessun risultato/i)).toBeInTheDocument();
  });

  it("empty rows array shows EmptyState with 'Nuovo modello' when onCreate provided", () => {
    const onCreate = vi.fn();
    render(<ModelsTable rows={[]} onCreate={onCreate} />);
    expect(screen.getByText(/nessun modello/i)).toBeInTheDocument();
    const btn = screen.getByRole("button", { name: /nuovo modello/i });
    fireEvent.click(btn);
    expect(onCreate).toHaveBeenCalledTimes(1);
  });

  it("clicking sortable header toggles sort direction", () => {
    render(<ModelsTable rows={ROWS} />);
    // Clic su "Modello" → sort by name asc (default per stringhe)
    const headerCells = screen.getAllByRole("columnheader");
    const nameTh = headerCells.find((th) => /modello/i.test(th.textContent ?? ""))!;
    fireEvent.click(nameTh);
    expect(nameTh.getAttribute("aria-sort")).toBe("ascending");
    fireEvent.click(nameTh);
    expect(nameTh.getAttribute("aria-sort")).toBe("descending");
  });
});
