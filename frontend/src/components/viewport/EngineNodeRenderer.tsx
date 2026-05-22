import { useEffect, useMemo, useRef } from "react";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { useModelStore } from "../../store/modelStore";
import { useAnalysisStore } from "../../store/analysisStore";
import { useUIStore } from "../../store/uiStore";
import { useSelectionStore } from "../../store/selectionStore";
import { useWorkspaceStore } from "../../store/workspaceStore";
import { useRightRailStore } from "../../store/rightRailStore";
import { modelBounds } from "../../utils/geometry";
import {
  composeNodeInstanceMatrix,
  createNodeInstanceIndex,
  nodeInstanceColor,
} from "../../viewport-engine/nodeInstances";

export function EngineNodeRenderer() {
  const model = useModelStore((s) => s.model)!;
  const selectedIds = useModelStore((s) => s.selectedNodeIds);
  const selectNode = useModelStore((s) => s.selectNode);
  const setHover = useModelStore((s) => s.setHover);
  const hover = useModelStore((s) => s.hover);
  const showLabels = useAnalysisStore((s) => s.showNodeLabels);
  const openEditNode = useUIStore((s) => s.openEditNode);
  const meshRef = useRef<THREE.InstancedMesh>(null);

  const radius = useMemo(() => {
    const b = modelBounds(model);
    return Math.max(b.size * 0.012, 0.02);
  }, [model]);

  const nodeIdsByInstance = useMemo(() => createNodeInstanceIndex(model.nodes), [model.nodes]);
  const nodesById = useMemo(() => new Map(model.nodes.map((node) => [node.id, node])), [model.nodes]);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const matrix = new THREE.Matrix4();
    const color = new THREE.Color();
    model.nodes.forEach((node, index) => {
      const hovered = hover?.kind === "node" && hover.id === node.id;
      composeNodeInstanceMatrix(node, hovered ? radius * 1.4 : radius, matrix);
      mesh.setMatrixAt(index, matrix);
      mesh.setColorAt(index, nodeInstanceColor(selectedIds.has(node.id), hovered, color));
    });
    mesh.count = model.nodes.length;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [model.nodes, hover, radius, selectedIds]);

  const nodeFromInstance = (instanceId: number | undefined) => {
    if (instanceId === undefined) return null;
    const nodeId = nodeIdsByInstance[instanceId];
    return nodesById.get(nodeId) ?? null;
  };

  if (model.nodes.length === 0) return null;

  return (
    <group>
      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, model.nodes.length]}
        onClick={(e) => {
          const node = nodeFromInstance(e.instanceId);
          if (!node) return;
          e.stopPropagation();
          selectNode(node.id, e.shiftKey);
          if (!e.shiftKey) {
            useSelectionStore.getState().selectNode(node.id);
            useWorkspaceStore.getState().openRightPanel("inspect");
            useRightRailStore.getState().open("inspect");
          }
        }}
        onDoubleClick={(e) => {
          const node = nodeFromInstance(e.instanceId);
          if (!node) return;
          e.stopPropagation();
          openEditNode(node.id);
        }}
        onPointerMove={(e) => {
          const node = nodeFromInstance(e.instanceId);
          if (!node) return;
          e.stopPropagation();
          setHover({ kind: "node", id: node.id, x: node.x, y: node.y, z: node.z });
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHover(null);
          document.body.style.cursor = "auto";
        }}
      >
        <sphereGeometry args={[1, 16, 16]} />
        <meshStandardMaterial
          vertexColors
          emissive="#003848"
          emissiveIntensity={0.35}
        />
      </instancedMesh>
      {showLabels && model.nodes.map((n) => (
        <Html key={n.id} distanceFactor={10} position={[n.x + radius * 2, n.y + radius * 2, n.z]}>
          <div className="text-[10px] numeric text-accent-primary px-1 bg-bg/80 rounded">
            N{n.id}
          </div>
        </Html>
      ))}
    </group>
  );
}

