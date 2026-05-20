import { useMemo, useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useModelStore } from "../../store/modelStore";
import { useResultsStore } from "../../store/resultsStore";
import { nodeById } from "../../utils/geometry";

/**
 * Anima la struttura nel tempo usando la storia temporale dei nodi.
 *
 * Per ogni elemento beam/shell disegna i segmenti deformati: x(t) = x0 + u(t) * scale.
 * Il tempo corrente viene avanzato automaticamente quando `dynamicAnimating` è true,
 * oppure può essere controllato manualmente tramite slider.
 */
export function DynamicAnimation() {
  const model = useModelStore((s) => s.model)!;
  const dyn = useResultsStore((s) => s.dynamicResults);
  const show = useResultsStore((s) => s.showDynamicAnimation);
  const animating = useResultsStore((s) => s.dynamicAnimating);
  const scale = useResultsStore((s) => s.dynamicAmpScale);
  const timeIdx = useResultsStore((s) => s.dynamicTimeIndex);
  const setTimeIdx = useResultsStore((s) => s.setDynamicTimeIndex);
  const ref = useRef<THREE.LineSegments>(null!);
  const playState = useRef({ idx: 0, lastT: 0 });

  const base = useMemo(() => {
    if (!dyn) return null;
    const byId = nodeById(model);
    const positions: number[] = [];
    const nodeRefs: number[] = [];
    for (const el of model.elements) {
      const pairs =
        el.type === "shell_q4" ? [[0, 1], [1, 2], [2, 3], [3, 0]]
        : el.type === "solid_h8" ? [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]]
        : [[0, 1]];
      for (const [a, b] of pairs) {
        const na = byId.get(el.nodes[a]); const nb = byId.get(el.nodes[b]);
        if (!na || !nb) continue;
        positions.push(na.x, na.y, na.z, nb.x, nb.y, nb.z);
        nodeRefs.push(el.nodes[a], el.nodes[b]);
      }
    }
    return { base: new Float32Array(positions), nodeRefs };
  }, [model, dyn]);

  useEffect(() => {
    playState.current.idx = timeIdx;
  }, [timeIdx]);

  useFrame((state) => {
    if (!ref.current || !base || !dyn) return;
    if (animating) {
      const dtReal = state.clock.elapsedTime - playState.current.lastT;
      if (dtReal > 0.04) {
        playState.current.lastT = state.clock.elapsedTime;
        playState.current.idx = (playState.current.idx + 1) % dyn.times.length;
        setTimeIdx(playState.current.idx);
      }
    }
    const i = playState.current.idx;
    const arr = ref.current.geometry.attributes.position.array as Float32Array;
    for (let s = 0; s < base.nodeRefs.length; s++) {
      const nid = base.nodeRefs[s];
      const hist = dyn.node_history[nid];
      const dx = hist ? hist.ux[i] : 0;
      const dy = hist ? hist.uy[i] : 0;
      const dz = hist ? hist.uz[i] : 0;
      arr[s * 3]     = base.base[s * 3]     + dx * scale;
      arr[s * 3 + 1] = base.base[s * 3 + 1] + dy * scale;
      arr[s * 3 + 2] = base.base[s * 3 + 2] + dz * scale;
    }
    ref.current.geometry.attributes.position.needsUpdate = true;
  });

  const geometry = useMemo(() => {
    if (!base) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(base.base), 3));
    return g;
  }, [base]);

  if (!show || !dyn || !geometry) return null;

  return (
    <lineSegments ref={ref} geometry={geometry}>
      <lineBasicMaterial color="#ffaa00" linewidth={2} transparent opacity={0.95} />
    </lineSegments>
  );
}
