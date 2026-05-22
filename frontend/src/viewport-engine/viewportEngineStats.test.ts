/**
 * viewportEngineStats tests (v1.6.1 T4 · BUG-5).
 *
 * Verifica il counter per tipologia entita' e il compression ratio
 * (oldApproxObjects / engineDrawPaths) che misura quanti "draw call
 * mesh" risparmia InstancedMesh rispetto al renderer legacy.
 */
import { describe, it, expect } from "vitest";
import type { Element, FEAModel, Node } from "../types/model";
import { createViewportEngineStats } from "./viewportEngineStats";

const node = (id: number): Node => ({ id, x: 0, y: 0, z: 0 });
const elem = (id: number, type: Element["type"], n: number[]): Element => ({
  id,
  type,
  nodes: n,
  material_id: "S275",
});
const model = (nodes: Node[], elements: Element[]): FEAModel => ({
  id: "m",
  name: "test",
  units: "SI",
  is_3d: true,
  nodes,
  elements,
  loads: [],
  constraints: [],
});

describe("viewportEngineStats", () => {
  it("model null → tutti zero, compressionRatio = 1", () => {
    const s = createViewportEngineStats(null);
    expect(s.nodes).toBe(0);
    expect(s.lineElements).toBe(0);
    expect(s.surfaceElements).toBe(0);
    expect(s.solidElements).toBe(0);
    expect(s.unsupportedElements).toBe(0);
    expect(s.compressionRatio).toBe(1);
  });

  it("conta per tipologia (line / surface / solid / unsupported)", () => {
    const m = model(
      Array.from({ length: 50 }, (_, i) => node(i + 1)),
      [
        ...Array.from({ length: 10 }, (_, i) => elem(i + 1, "beam3d", [1, 2])),
        ...Array.from({ length: 5 }, (_, i) => elem(100 + i, "shell_q4", [1, 2, 3, 4])),
        ...Array.from({ length: 3 }, (_, i) => elem(200 + i, "solid_h8", [1, 2, 3, 4, 5, 6, 7, 8])),
        elem(999, "spring2d" as Element["type"], [1, 2]),
      ],
    );
    const s = createViewportEngineStats(m);
    expect(s.nodes).toBe(50);
    expect(s.lineElements).toBe(10);
    expect(s.surfaceElements).toBe(5);
    expect(s.solidElements).toBe(3);
    expect(s.unsupportedElements).toBe(1);
  });

  it("engineDrawPaths somma 1 per ogni tipologia presente (con extra per surface/solid)", () => {
    const m = model(
      [node(1), node(2)],
      [elem(1, "beam3d", [1, 2])],
    );
    const s = createViewportEngineStats(m);
    // nodes(1) + line(1) = 2 draw paths
    expect(s.engineDrawPaths).toBe(2);
  });

  it("compressionRatio > 1 quando ci sono molte entita' line (InstancedMesh paga)", () => {
    const nodes = Array.from({ length: 1000 }, (_, i) => node(i + 1));
    const elements = Array.from({ length: 500 }, (_, i) => elem(i + 1, "beam3d", [1, 2]));
    const s = createViewportEngineStats(model(nodes, elements));
    // oldApproxObjects ~= 1000 nodi + 500 beam = 1500
    // engineDrawPaths = 1 (nodes) + 1 (line) = 2
    // ratio ~= 750
    expect(s.oldApproxObjects).toBe(1500);
    expect(s.engineDrawPaths).toBe(2);
    expect(s.compressionRatio).toBeGreaterThan(100);
  });

  it("compressionRatio = 1 quando engineDrawPaths e' zero (no entita')", () => {
    const s = createViewportEngineStats(model([], []));
    expect(s.engineDrawPaths).toBe(0);
    expect(s.compressionRatio).toBe(1);
  });

  it("conta nodes anche se elements e' vuoto", () => {
    const s = createViewportEngineStats(model([node(1), node(2), node(3)], []));
    expect(s.nodes).toBe(3);
    expect(s.engineDrawPaths).toBe(1);
  });

  // v1.6.1 T5 · parity guard: il count "shared truth" tra Legacy ed Engine.
  // Se per qualche regression viewport-engine non riconosce un tipo che
  // Legacy renderizza, il count divergerebbe e questa unit test diventa
  // sentinella.
  it("conta tutti i tipi standard (no unsupported per modello demo telaio)", () => {
    const m = model(
      [node(1), node(2), node(3), node(4)],
      [
        elem(1, "beam3d", [1, 2]),
        elem(2, "truss3d", [2, 3]),
        elem(3, "shell_q4", [1, 2, 3, 4]),
        elem(4, "solid_t4", [1, 2, 3, 4]),
      ],
    );
    const s = createViewportEngineStats(m);
    expect(s.unsupportedElements).toBe(0);
    expect(s.lineElements + s.surfaceElements + s.solidElements).toBe(4);
  });
});
