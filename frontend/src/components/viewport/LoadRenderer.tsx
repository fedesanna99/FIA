import { useMemo, type ReactElement } from "react";
import * as THREE from "three";
import { useModelStore } from "../../store/modelStore";
import { useAnalysisStore } from "../../store/analysisStore";
import { nodeById, modelBounds } from "../../utils/geometry";

export function LoadRenderer() {
  const model = useModelStore((s) => s.model)!;
  const showLoads = useAnalysisStore((s) => s.showLoads);

  const arrowScale = useMemo(() => {
    const b = modelBounds(model);
    return Math.max(b.size * 0.15, 0.3);
  }, [model]);
  const byId = useMemo(() => nodeById(model), [model]);

  if (!showLoads) return null;

  return (
    <group>
      {model.loads.map((load) => {
        if (load.type === "nodal") {
          const n = byId.get(load.target_id);
          if (!n) return null;
          const fx = load.fx ?? 0;
          const fy = load.fy ?? 0;
          const fz = load.fz ?? 0;
          const magnitude = Math.hypot(fx, fy, fz);
          if (magnitude === 0) return null;
          const dir = new THREE.Vector3(fx, fy, fz).normalize();
          const origin = new THREE.Vector3(n.x, n.y, n.z);
          const tip = origin.clone().sub(dir.clone().multiplyScalar(arrowScale));
          return (
            <Arrow key={`load-${load.id}`} from={tip} to={origin} color="#ffaa00" />
          );
        }
        if (load.type === "distributed") {
          const el = model.elements.find((e) => e.id === load.target_id);
          if (!el) return null;
          const n1 = byId.get(el.nodes[0]);
          const n2 = byId.get(el.nodes[1]);
          if (!n1 || !n2) return null;
          const segments = 6;
          const arrows: ReactElement[] = [];
          const qy = load.qy ?? 0;
          const qz = load.qz ?? 0;
          if (qy === 0 && qz === 0) return null;
          for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const px = n1.x + (n2.x - n1.x) * t;
            const py = n1.y + (n2.y - n1.y) * t;
            const pz = n1.z + (n2.z - n1.z) * t;
            const dir = new THREE.Vector3(0, qy < 0 ? -1 : 1, qz !== 0 ? Math.sign(qz) : 0).normalize();
            const tip = new THREE.Vector3(px, py, pz);
            const origin = tip.clone().sub(dir.clone().multiplyScalar(arrowScale * 0.5));
            arrows.push(<Arrow key={`l-${load.id}-${i}`} from={origin} to={tip} color="#ffaa00" thin />);
          }
          return <group key={`load-${load.id}`}>{arrows}</group>;
        }
        if (load.type === "nodal_mass") {
          const n = byId.get(load.target_id);
          if (!n) return null;
          return (
            <mesh key={`m-${load.id}`} position={[n.x, n.y, n.z]}>
              <boxGeometry args={[arrowScale * 0.18, arrowScale * 0.18, arrowScale * 0.18]} />
              <meshStandardMaterial color="#aa44ff" emissive="#220033" />
            </mesh>
          );
        }
        return null;
      })}
    </group>
  );
}

function Arrow({ from, to, color, thin = false }: {
  from: THREE.Vector3; to: THREE.Vector3; color: string; thin?: boolean;
}) {
  const dir = new THREE.Vector3().subVectors(to, from);
  const length = dir.length();
  if (length === 0) return null;
  const mid = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);
  const quat = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    dir.clone().normalize(),
  );
  const r = thin ? length * 0.04 : length * 0.06;
  return (
    <group position={mid.toArray()} quaternion={[quat.x, quat.y, quat.z, quat.w]}>
      <mesh>
        <cylinderGeometry args={[r * 0.5, r * 0.5, length * 0.7, 8]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[0, length * 0.35, 0]}>
        <coneGeometry args={[r * 1.4, length * 0.3, 12]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}
