import type { FEAModel } from "../types/model";
import { isLineElement } from "./lineElementInstances";
import { isSolidElement } from "./solidElementGeometry";
import { isSurfaceElement } from "./surfaceElementGeometry";

export interface ViewportEngineStats {
  nodes: number;
  lineElements: number;
  surfaceElements: number;
  solidElements: number;
  unsupportedElements: number;
  oldApproxObjects: number;
  engineDrawPaths: number;
  compressionRatio: number;
}

export function createViewportEngineStats(model: FEAModel | null): ViewportEngineStats {
  if (!model) {
    return {
      nodes: 0,
      lineElements: 0,
      surfaceElements: 0,
      solidElements: 0,
      unsupportedElements: 0,
      oldApproxObjects: 0,
      engineDrawPaths: 0,
      compressionRatio: 1,
    };
  }

  let lineElements = 0;
  let surfaceElements = 0;
  let solidElements = 0;
  let unsupportedElements = 0;

  for (const element of model.elements) {
    if (isLineElement(element)) lineElements += 1;
    else if (isSurfaceElement(element)) surfaceElements += 1;
    else if (isSolidElement(element)) solidElements += 1;
    else unsupportedElements += 1;
  }

  const nodes = model.nodes.length;
  const oldApproxObjects =
    nodes +
    lineElements +
    surfaceElements * 2 +
    solidElements * 2 +
    unsupportedElements;
  const engineDrawPaths =
    (nodes > 0 ? 1 : 0) +
    (lineElements > 0 ? 1 : 0) +
    (surfaceElements > 0 ? 2 : 0) +
    (solidElements > 0 ? 2 : 0) +
    unsupportedElements;

  return {
    nodes,
    lineElements,
    surfaceElements,
    solidElements,
    unsupportedElements,
    oldApproxObjects,
    engineDrawPaths,
    compressionRatio: engineDrawPaths > 0 ? oldApproxObjects / engineDrawPaths : 1,
  };
}

