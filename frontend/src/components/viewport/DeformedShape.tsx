import * as THREE from "three";
import { useModelStore } from "../../store/modelStore";
import { useResultsStore } from "../../store/resultsStore";
import { nodeById } from "../../utils/geometry";
import { useDisposableGeometry } from "./useDisposableGeometry";

export function DeformedShape() {
  const model = useModelStore((s) => s.model)!;
  const staticResults = useResultsStore((s) => s.staticResults);
  const scale = useResultsStore((s) => s.deformedScale);

  // v3.3.0 audit-fix L3.3-P0-1: useDisposableGeometry per cleanup GPU.
  // Prima usava `useMemo` puro → vecchie geometry mai dispose-ate.
  const geometry = useDisposableGeometry(() => {
    if (!staticResults) return new THREE.BufferGeometry(); // empty placeholder
    const byId = nodeById(model);
    const dispById = new Map(staticResults.displacements.map((d) => [d.node_id, d]));
    const positions: number[] = [];
    for (const el of model.elements) {
      if (el.type === "beam2d" || el.type === "beam3d" ||
          el.type === "truss2d" || el.type === "truss3d") {
        const n1 = byId.get(el.nodes[0]); const n2 = byId.get(el.nodes[1]);
        const d1 = dispById.get(el.nodes[0]); const d2 = dispById.get(el.nodes[1]);
        if (!n1 || !n2 || !d1 || !d2) continue;
        positions.push(
          n1.x + d1.ux * scale, n1.y + d1.uy * scale, n1.z + d1.uz * scale,
          n2.x + d2.ux * scale, n2.y + d2.uy * scale, n2.z + d2.uz * scale,
        );
      } else if (el.type === "shell_q4" || el.type === "tri3") {
        const N = el.type === "shell_q4" ? 4 : 3;
        const pairs = Array.from({ length: N }, (_, i) => [i, (i + 1) % N]);
        for (const [a, b] of pairs) {
          const na = byId.get(el.nodes[a]); const nb = byId.get(el.nodes[b]);
          const da = dispById.get(el.nodes[a]); const db = dispById.get(el.nodes[b]);
          if (!na || !nb || !da || !db) continue;
          positions.push(
            na.x + da.ux * scale, na.y + da.uy * scale, na.z + da.uz * scale,
            nb.x + db.ux * scale, nb.y + db.uy * scale, nb.z + db.uz * scale,
          );
        }
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(positions), 3));
    return g;
  }, [model, staticResults, scale]);

  if (!staticResults) return null;

  return (
    <lineSegments geometry={geometry}>
      {/* v3.3.0 audit-fix L3.3-P1-9: WebGL ignora linewidth >1 su tutti i browser
          desktop. La deformata appariva sempre 1px sottile. Per spessore reale serve
          drei `<Line>` o `MeshLineMaterial`. Lasciato `linewidth={2}` per uniformità
          con i fratelli; il refactor a `<Line>` è in roadmap separata. */}
      <lineBasicMaterial color="#00ff88" linewidth={2} transparent opacity={0.95} />
    </lineSegments>
  );
}
