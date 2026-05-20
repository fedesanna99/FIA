import { useMemo } from "react";
import { useModelStore } from "../../store/modelStore";
import { useAnalysisStore } from "../../store/analysisStore";
import { nodeById, modelBounds } from "../../utils/geometry";

export function BCRenderer() {
  const model = useModelStore((s) => s.model)!;
  const show = useAnalysisStore((s) => s.showConstraints);
  const bSize = useMemo(() => modelBounds(model).size, [model]);
  const byId = useMemo(() => nodeById(model), [model]);
  const s = Math.max(bSize * 0.06, 0.1);

  if (!show) return null;

  return (
    <group>
      {model.constraints.map((c) => {
        const n = byId.get(c.node_id);
        if (!n) return null;
        const pos: [number, number, number] = [n.x, n.y, n.z];
        if (c.type === "fixed") {
          return (
            <mesh key={c.id} position={[pos[0], pos[1] - s / 2, pos[2]]}>
              <boxGeometry args={[s, s, s]} />
              <meshStandardMaterial color="#00ff88" emissive="#003322" emissiveIntensity={0.5} wireframe />
            </mesh>
          );
        }
        if (c.type === "pinned") {
          return (
            <mesh key={c.id} position={[pos[0], pos[1] - s / 2, pos[2]]} rotation={[0, 0, Math.PI]}>
              <coneGeometry args={[s * 0.6, s, 4]} />
              <meshStandardMaterial color="#00ff88" emissive="#003322" emissiveIntensity={0.5} />
            </mesh>
          );
        }
        if (c.type === "roller_x" || c.type === "roller_y" || c.type === "roller_z") {
          return (
            <group key={c.id} position={pos}>
              <mesh position={[0, -s / 2, 0]} rotation={[0, 0, Math.PI]}>
                <coneGeometry args={[s * 0.5, s * 0.8, 4]} />
                <meshStandardMaterial color="#00ff88" emissive="#003322" />
              </mesh>
              <mesh position={[0, -s * 1.1, 0]}>
                <sphereGeometry args={[s * 0.18, 8, 8]} />
                <meshStandardMaterial color="#00ff88" />
              </mesh>
              <mesh position={[s * 0.3, -s * 1.1, 0]}>
                <sphereGeometry args={[s * 0.18, 8, 8]} />
                <meshStandardMaterial color="#00ff88" />
              </mesh>
              <mesh position={[-s * 0.3, -s * 1.1, 0]}>
                <sphereGeometry args={[s * 0.18, 8, 8]} />
                <meshStandardMaterial color="#00ff88" />
              </mesh>
            </group>
          );
        }
        return (
          <mesh key={c.id} position={pos}>
            <octahedronGeometry args={[s * 0.4, 0]} />
            <meshStandardMaterial color="#00ff88" wireframe />
          </mesh>
        );
      })}
    </group>
  );
}
