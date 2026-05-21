import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

import { useNavigationCommands, getNavigationCommandsCount } from "./useNavigationCommands";
import { useModelStore } from "../store/modelStore";
import type { FEAModel } from "../types/model";


function makeModel(nodeCount: number, elementCount: number): FEAModel {
  return {
    id: "test-model",
    name: "Test",
    units: "SI",
    is_3d: false,
    nodes: Array.from({ length: nodeCount }, (_, i) => ({
      id: i + 1,
      x: i,
      y: i * 2,
      z: 0,
    })),
    elements: Array.from({ length: elementCount }, (_, i) => ({
      id: i + 1,
      type: "beam2d",
      nodes: [i + 1, i + 2],
      material_id: "steel_s355",
    })),
    loads: [],
    constraints: [],
  };
}


beforeEach(() => {
  act(() => {
    useModelStore.getState().setModel(null);
  });
});


describe("useNavigationCommands", () => {
  it("returns empty array when model is null", () => {
    const { result } = renderHook(() => useNavigationCommands());
    expect(result.current).toEqual([]);
  });

  it("generates 1 item per node + 1 per element", () => {
    act(() => useModelStore.getState().setModel(makeModel(3, 2)));
    const { result } = renderHook(() => useNavigationCommands());
    expect(result.current.length).toBe(5);
    const nodes = result.current.filter((it) => it.actionKind === "goto-node");
    const els = result.current.filter((it) => it.actionKind === "goto-element");
    expect(nodes.length).toBe(3);
    expect(els.length).toBe(2);
  });

  it("node items have id format goto-node-{id} and useful aliases", () => {
    act(() => useModelStore.getState().setModel(makeModel(2, 0)));
    const { result } = renderHook(() => useNavigationCommands());
    const item = result.current.find((it) => it.id === "goto-node-1");
    expect(item).toBeDefined();
    expect(item?.label).toBe("Vai a · Nodo N1");
    expect(item?.aliases).toContain("n1");
    expect(item?.aliases).toContain("1");
    expect(item?.actionKind).toBe("goto-node");
    expect((item?.payload as { nodeId: number }).nodeId).toBe(1);
  });

  it("element items use beam2d type in description", () => {
    act(() => useModelStore.getState().setModel(makeModel(0, 1)));
    const { result } = renderHook(() => useNavigationCommands());
    const item = result.current.find((it) => it.id === "goto-element-1");
    expect(item).toBeDefined();
    expect(item?.description).toContain("beam2d");
    expect(item?.actionKind).toBe("goto-element");
  });

  it("caps to 200 nodes per category", () => {
    act(() => useModelStore.getState().setModel(makeModel(500, 0)));
    const { result } = renderHook(() => useNavigationCommands());
    const nodes = result.current.filter((it) => it.actionKind === "goto-node");
    expect(nodes.length).toBe(200);
  });

  it("getNavigationCommandsCount reflects current model state", () => {
    expect(getNavigationCommandsCount()).toEqual({
      nodes: 0,
      elements: 0,
      total: 0,
      capped: false,
    });
    act(() => useModelStore.getState().setModel(makeModel(10, 5)));
    expect(getNavigationCommandsCount()).toEqual({
      nodes: 10,
      elements: 5,
      total: 15,
      capped: false,
    });
    act(() => useModelStore.getState().setModel(makeModel(300, 0)));
    expect(getNavigationCommandsCount().capped).toBe(true);
  });

  it("all generated items have needsModel=true and section=commands", () => {
    act(() => useModelStore.getState().setModel(makeModel(3, 3)));
    const { result } = renderHook(() => useNavigationCommands());
    for (const item of result.current) {
      expect(item.needsModel).toBe(true);
      expect(item.section).toBe("commands");
    }
  });
});
