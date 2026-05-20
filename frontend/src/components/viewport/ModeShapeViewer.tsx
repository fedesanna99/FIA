import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useModelStore } from "../../store/modelStore";
import { useResultsStore } from "../../store/resultsStore";
import { nodeById } from "../../utils/geometry";

export function ModeShapeViewer() {
  const model = useModelStore((s) => s.model)!;
  const modal = useResultsStore((s) => s.modalResults);
  const selectedIdx = useResultsStore((s) => s.selectedModeIndex);
  const animating = useResultsStore((s) => s.modeAnimating);
  const amplitude = useResultsStore((s) => s.modeAnimAmplitude);
  const lineRef = useRef<THREE.LineSegments>(null!);

  const mode = modal?.modes[selectedIdx];

  const data = useMemo(() => {
    if (!mode) return null;
    const byId = nodeById(model);
    const dispById = new Map(mode.displacements.map((d) => [d.node_id, d]));
    const basePositions: number[] = [];
    const offsets: number[] = [];
    for (const el of model.elements) {
      const pairs =
        el.type === "shell_q4" ? [[0, 1], [1, 2], [2, 3], [3, 0]]
        : el.type === "solid_h8" ? [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]]
        : [[0, 1]];
      for (const [a, b] of pairs) {
        const na = byId.get(el.nodes[a]); const nb = byId.get(el.nodes[b]);
        const da = dispById.get(el.nodes[a]); const db = dispById.get(el.nodes[b]);
        if (!na || !nb || !da || !db) continue;
        basePositions.push(na.x, na.y, na.z, nb.x, nb.y, nb.z);
        offsets.push(da.ux, da.uy, da.uz, db.ux, db.uy, db.uz);
      }
    }
    return { base: new Float32Array(basePositions), offsets: new Float32Array(offsets) };
  }, [model, mode]);

  useFrame((state) => {
    if (!lineRef.current || !data) return;
    const t = animating ? Math.sin(state.clock.elapsedTime * 2.0 * Math.PI * 0.5) : 1.0;
    const scale = amplitude * t;
    const arr = lineRef.current.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < arr.length; i++) {
      arr[i] = data.base[i] + data.offsets[i] * scale;
    }
    lineRef.current.geometry.attributes.position.needsUpdate = true;
  });

  const geometry = useMemo(() => {
    if (!data) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(data.base), 3));
    return g;
  }, [data]);

  if (!data || !geometry) return null;

  return (
    <lineSegments ref={lineRef} geometry={geometry}>
      <lineBasicMaterial color="#ff66cc" linewidth={2} transparent opacity={0.9} />
    </lineSegments>
  );
}
