import { useMemo } from "react";
import { Html } from "@react-three/drei";
import { useModelStore } from "../../store/modelStore";
import { useAnalysisStore } from "../../store/analysisStore";
import { useUIStore } from "../../store/uiStore";
import { modelBounds } from "../../utils/geometry";

export function NodeRenderer() {
  const model = useModelStore((s) => s.model)!;
  const selectedIds = useModelStore((s) => s.selectedNodeIds);
  const selectNode = useModelStore((s) => s.selectNode);
  const setHover = useModelStore((s) => s.setHover);
  const hover = useModelStore((s) => s.hover);
  const showLabels = useAnalysisStore((s) => s.showNodeLabels);
  const openEditNode = useUIStore((s) => s.openEditNode);

  const radius = useMemo(() => {
    const b = modelBounds(model);
    return Math.max(b.size * 0.012, 0.02);
  }, [model]);

  return (
    <group>
      {model.nodes.map((n) => {
        const selected = selectedIds.has(n.id);
        const hovered = hover?.kind === "node" && hover.id === n.id;
        return (
          <group key={n.id} position={[n.x, n.y, n.z]}>
            <mesh
              onClick={(e) => {
                e.stopPropagation();
                selectNode(n.id, e.shiftKey);
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                openEditNode(n.id);
              }}
              onPointerOver={(e) => {
                e.stopPropagation();
                setHover({ kind: "node", id: n.id, x: n.x, y: n.y, z: n.z });
                document.body.style.cursor = "pointer";
              }}
              onPointerOut={() => {
                setHover(null);
                document.body.style.cursor = "auto";
              }}
            >
              <sphereGeometry args={[hovered ? radius * 1.4 : radius, 16, 16]} />
              <meshStandardMaterial
                color={selected ? "#ffaa00" : hovered ? "#00ff88" : "#00d4ff"}
                emissive={selected ? "#ffaa00" : hovered ? "#00ff88" : "#003848"}
                emissiveIntensity={selected || hovered ? 0.6 : 0.3}
              />
            </mesh>
            {showLabels && (
              <Html distanceFactor={10} position={[radius * 2, radius * 2, 0]}>
                <div className="text-[10px] numeric text-accent-primary px-1 bg-bg/80 rounded">
                  N{n.id}
                </div>
              </Html>
            )}
          </group>
        );
      })}
    </group>
  );
}
