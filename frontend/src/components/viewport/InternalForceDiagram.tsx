import { useMemo } from "react";
import * as THREE from "three";
import { useModelStore } from "../../store/modelStore";
import { useResultsStore } from "../../store/resultsStore";
import { useAnalysisStore } from "../../store/analysisStore";
import { nodeById, modelBounds } from "../../utils/geometry";

type Component = "N" | "V" | "M";

interface Props {
  component: Component;
  scale?: number;
}

export function InternalForceDiagram({ component, scale = 1 }: Props) {
  const model = useModelStore((s) => s.model)!;
  const staticRes = useResultsStore((s) => s.staticResults);
  const showDiagram = useAnalysisStore((s) => s.showDiagrams);
  const diagramComp = useAnalysisStore((s) => s.diagramComponent);

  const bSize = useMemo(() => modelBounds(model).size, [model]);
  const geometry = useMemo(() => {
    if (!staticRes || !showDiagram || component !== diagramComp) return null;
    const byId = nodeById(model);
    const fByEl = new Map(staticRes.element_forces.map((f) => [f.element_id, f]));
    const allValues: number[] = [];
    staticRes.element_forces.forEach((f) => {
      if (component === "N") allValues.push(f.N_i, f.N_j);
      else if (component === "V") allValues.push(f.Vy_i, f.Vy_j);
      else allValues.push(f.Mz_i, f.Mz_j);
    });
    const maxAbs = Math.max(...allValues.map(Math.abs), 1);
    const visualLen = bSize * 0.15 * scale;
    const positions: number[] = [];
    for (const el of model.elements) {
      if (!["beam2d", "beam3d", "truss2d", "truss3d"].includes(el.type)) continue;
      const n1 = byId.get(el.nodes[0]);
      const n2 = byId.get(el.nodes[1]);
      const f = fByEl.get(el.id);
      if (!n1 || !n2 || !f) continue;
      const axis = new THREE.Vector3(n2.x - n1.x, n2.y - n1.y, n2.z - n1.z);
      const L = axis.length();
      if (L < 1e-9) continue;
      axis.normalize();
      let perp = new THREE.Vector3(-axis.y, axis.x, 0);
      if (perp.lengthSq() < 1e-6) perp = new THREE.Vector3(0, -axis.z, axis.y);
      perp.normalize();
      const vi = component === "N" ? f.N_i : component === "V" ? f.Vy_i : f.Mz_i;
      const vj = component === "N" ? f.N_j : component === "V" ? f.Vy_j : f.Mz_j;
      const oi = perp.clone().multiplyScalar((vi / maxAbs) * visualLen);
      const oj = perp.clone().multiplyScalar((vj / maxAbs) * visualLen);
      const p_i = new THREE.Vector3(n1.x, n1.y, n1.z);
      const p_j = new THREE.Vector3(n2.x, n2.y, n2.z);
      const top_i = p_i.clone().add(oi);
      const top_j = p_j.clone().add(oj);
      positions.push(p_i.x, p_i.y, p_i.z, top_i.x, top_i.y, top_i.z);
      positions.push(p_j.x, p_j.y, p_j.z, top_j.x, top_j.y, top_j.z);
      positions.push(top_i.x, top_i.y, top_i.z, top_j.x, top_j.y, top_j.z);
      positions.push(p_i.x, p_i.y, p_i.z, p_j.x, p_j.y, p_j.z);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(positions), 3));
    return g;
  }, [model, staticRes, bSize, scale, component, showDiagram, diagramComp]);

  if (!geometry) return null;
  const color = component === "N" ? "#00d4ff" : component === "V" ? "#ffaa00" : "#ff66cc";
  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial color={color} transparent opacity={0.85} />
    </lineSegments>
  );
}
