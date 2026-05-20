import { useMemo } from "react";
import * as THREE from "three";
import { useModelStore } from "../../store/modelStore";
import { useResultsStore } from "../../store/resultsStore";
import { useUIStore } from "../../store/uiStore";
import { nodeById, modelBounds } from "../../utils/geometry";
import { jetHex } from "../../utils/colormap";
import type { ViewportMode } from "../../store/analysisStore";

interface Props {
  mode: ViewportMode;
  colormap: boolean;
}

export function ElementRenderer({ mode, colormap }: Props) {
  const model = useModelStore((s) => s.model)!;
  const selectedIds = useModelStore((s) => s.selectedElementIds);
  const selectElement = useModelStore((s) => s.selectElement);
  const setHover = useModelStore((s) => s.setHover);
  const openEditElement = useUIStore((s) => s.openEditElement);
  const staticResults = useResultsStore((s) => s.staticResults);

  const hoverIn = (el: { id: number; type: string; nodes: number[] }) => {
    setHover({ kind: "element", id: el.id, type: el.type, nodes: el.nodes });
    document.body.style.cursor = "pointer";
  };
  const hoverOut = () => {
    setHover(null);
    document.body.style.cursor = "auto";
  };

  const beamRadius = useMemo(() => {
    const b = modelBounds(model);
    return Math.max(b.size * 0.006, 0.012);
  }, [model]);

  const byId = useMemo(() => nodeById(model), [model]);
  const stressByEl = useMemo(() => {
    if (!staticResults) return new Map<number, number>();
    return new Map(staticResults.element_stresses.map((s) => [s.element_id, s.von_mises]));
  }, [staticResults]);
  const maxStress = staticResults?.max_stress ?? 1;

  const getColor = (eid: number, fallback: string) => {
    if (colormap && stressByEl.has(eid)) {
      const v = stressByEl.get(eid)!;
      return jetHex(maxStress > 0 ? v / maxStress : 0);
    }
    return fallback;
  };

  const transparent = mode === "transparent";
  const opacity = transparent ? 0.35 : 1.0;
  const wireframe = mode === "wireframe";

  return (
    <group>
      {model.elements.map((el) => {
        const selected = selectedIds.has(el.id);
        const baseColor = getColor(el.id, "#4a90d9");
        const color = selected ? "#ffaa00" : baseColor;

        if (el.type === "beam2d" || el.type === "beam3d" ||
            el.type === "truss2d" || el.type === "truss3d") {
          const n1 = byId.get(el.nodes[0]);
          const n2 = byId.get(el.nodes[1]);
          if (!n1 || !n2) return null;
          return (
            <BeamMesh
              key={el.id}
              p1={[n1.x, n1.y, n1.z]}
              p2={[n2.x, n2.y, n2.z]}
              radius={beamRadius * (el.type.startsWith("truss") ? 0.7 : 1.0)}
              color={color}
              opacity={opacity}
              wireframe={wireframe}
              onClick={(ev) => { ev.stopPropagation(); selectElement(el.id, ev.shiftKey); }}
              onDoubleClick={(ev: any) => { ev.stopPropagation(); openEditElement(el.id); }}
              onPointerOver={(ev: any) => { ev.stopPropagation(); hoverIn({ id: el.id, type: el.type, nodes: el.nodes }); }}
              onPointerOut={hoverOut}
            />
          );
        }
        // Cavi (BL-1): linee dashed sottili; pretesi in verde, slack in grigio
        if (el.type === "cable2d" || el.type === "cable3d") {
          const n1 = byId.get(el.nodes[0]);
          const n2 = byId.get(el.nodes[1]);
          if (!n1 || !n2) return null;
          const pretensioned = (el as any).pretension && (el as any).pretension > 0;
          const cableColor = selected
            ? "#ffaa00"
            : pretensioned ? "#3ec46d" : "#888a92";
          return (
            <CableLine
              key={el.id}
              p1={[n1.x, n1.y, n1.z]}
              p2={[n2.x, n2.y, n2.z]}
              color={cableColor}
              opacity={opacity}
              onClick={(ev) => { ev.stopPropagation(); selectElement(el.id, ev.shiftKey); }}
              onDoubleClick={(ev: any) => { ev.stopPropagation(); openEditElement(el.id); }}
              onPointerOver={(ev: any) => { ev.stopPropagation(); hoverIn({ id: el.id, type: el.type, nodes: el.nodes }); }}
              onPointerOut={hoverOut}
            />
          );
        }
        if (el.type === "shell_q4" || el.type === "shell_q4_mitc") {
          const pts = el.nodes.map((id) => byId.get(id)).filter(Boolean) as { x: number; y: number; z: number }[];
          if (pts.length !== 4) return null;
          return (
            <ShellMesh
              key={el.id}
              pts={pts.map((p) => [p.x, p.y, p.z]) as [number, number, number][]}
              color={getColor(el.id, "#2a6099")}
              selected={selected}
              opacity={opacity}
              wireframe={wireframe}
              onClick={(ev) => { ev.stopPropagation(); selectElement(el.id, ev.shiftKey); }}
              onDoubleClick={(ev: any) => { ev.stopPropagation(); openEditElement(el.id); }}
              onPointerOver={(ev: any) => { ev.stopPropagation(); hoverIn({ id: el.id, type: el.type, nodes: el.nodes }); }}
              onPointerOut={hoverOut}
            />
          );
        }
        if (el.type === "tri3") {
          const pts = el.nodes.map((id) => byId.get(id)).filter(Boolean) as { x: number; y: number; z: number }[];
          if (pts.length !== 3) return null;
          return (
            <TriMesh
              key={el.id}
              pts={pts.map((p) => [p.x, p.y, p.z]) as [number, number, number][]}
              color={getColor(el.id, "#2a6099")}
              selected={selected}
              opacity={opacity}
              wireframe={wireframe}
              onClick={(ev) => { ev.stopPropagation(); selectElement(el.id, ev.shiftKey); }}
              onDoubleClick={(ev: any) => { ev.stopPropagation(); openEditElement(el.id); }}
              onPointerOver={(ev: any) => { ev.stopPropagation(); hoverIn({ id: el.id, type: el.type, nodes: el.nodes }); }}
              onPointerOut={hoverOut}
            />
          );
        }
        if (el.type === "solid_h8") {
          const pts = el.nodes.map((id) => byId.get(id)).filter(Boolean) as { x: number; y: number; z: number }[];
          if (pts.length !== 8) return null;
          return (
            <SolidMesh
              key={el.id}
              pts={pts.map((p) => [p.x, p.y, p.z]) as [number, number, number][]}
              color={getColor(el.id, "#3a70b9")}
              selected={selected}
              opacity={opacity}
              wireframe={wireframe}
              onClick={(ev) => { ev.stopPropagation(); selectElement(el.id, ev.shiftKey); }}
              onDoubleClick={(ev: any) => { ev.stopPropagation(); openEditElement(el.id); }}
              onPointerOver={(ev: any) => { ev.stopPropagation(); hoverIn({ id: el.id, type: el.type, nodes: el.nodes }); }}
              onPointerOut={hoverOut}
            />
          );
        }
        // Tet4 / Tet10 (BL-3): tetraedro 4 vertici; per Tet10 prendiamo solo i 4 vertici principali
        if (el.type === "solid_t4" || el.type === "solid_t10") {
          const idxs = el.nodes.slice(0, 4);  // T10 ha 10 nodi, usiamo i primi 4 (vertici)
          const pts = idxs.map((id) => byId.get(id)).filter(Boolean) as { x: number; y: number; z: number }[];
          if (pts.length !== 4) return null;
          return (
            <TetMesh
              key={el.id}
              pts={pts.map((p) => [p.x, p.y, p.z]) as [number, number, number][]}
              color={getColor(el.id, "#3a70b9")}
              selected={selected}
              opacity={opacity}
              wireframe={wireframe}
              onClick={(ev) => { ev.stopPropagation(); selectElement(el.id, ev.shiftKey); }}
              onDoubleClick={(ev: any) => { ev.stopPropagation(); openEditElement(el.id); }}
              onPointerOver={(ev: any) => { ev.stopPropagation(); hoverIn({ id: el.id, type: el.type, nodes: el.nodes }); }}
              onPointerOut={hoverOut}
            />
          );
        }
        return null;
      })}
    </group>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Cable line — linea sottile per cavi (BL-1)
// ────────────────────────────────────────────────────────────────────────────
function CableLine({
  p1, p2, color, opacity, onClick, onPointerOver, onPointerOut, onDoubleClick,
}: {
  p1: [number, number, number]; p2: [number, number, number];
  color: string; opacity: number;
  onClick: (e: any) => void;
  onPointerOver?: (e: any) => void;
  onPointerOut?: (e: any) => void;
  onDoubleClick?: (e: any) => void;
}) {
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(
      new Float32Array([...p1, ...p2]), 3));
    return g;
  }, [p1, p2]);
  return (
    <group onClick={onClick} onDoubleClick={onDoubleClick} onPointerOver={onPointerOver} onPointerOut={onPointerOut}>
      <line>
        <primitive attach="geometry" object={geom} />
        <lineBasicMaterial color={color} transparent={opacity < 1} opacity={opacity} linewidth={2} />
      </line>
    </group>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Tet mesh — tetraedro a 4 facce triangolari (BL-3)
// ────────────────────────────────────────────────────────────────────────────
function TetMesh({
  pts, color, selected, opacity, wireframe, onClick, onPointerOver, onPointerOut, onDoubleClick,
}: {
  pts: [number, number, number][]; color: string; selected: boolean;
  opacity: number; wireframe: boolean;
  onClick: (e: any) => void;
  onPointerOver?: (e: any) => void;
  onPointerOut?: (e: any) => void;
  onDoubleClick?: (e: any) => void;
}) {
  // 4 facce: (0,1,2), (0,1,3), (0,2,3), (1,2,3)
  const faces = [[0, 1, 2], [0, 3, 1], [0, 2, 3], [1, 3, 2]];
  const geom = useMemo(() => {
    const tris: number[] = [];
    for (const [a, b, c] of faces) {
      tris.push(...pts[a], ...pts[b], ...pts[c]);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(tris), 3));
    g.computeVertexNormals();
    return g;
  }, [pts]);
  const edgeGeom = useMemo(() => {
    const pairs = [[0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3]];
    const e: number[] = [];
    for (const [a, b] of pairs) e.push(...pts[a], ...pts[b]);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(e), 3));
    return g;
  }, [pts]);
  return (
    <group onClick={onClick} onDoubleClick={onDoubleClick} onPointerOver={onPointerOver} onPointerOut={onPointerOut}>
      <mesh geometry={geom}>
        <meshStandardMaterial
          color={color}
          transparent={opacity < 1 || wireframe}
          opacity={wireframe ? 0 : opacity}
          wireframe={wireframe}
          metalness={0.2}
          roughness={0.6}
          side={THREE.DoubleSide}
        />
      </mesh>
      <lineSegments geometry={edgeGeom}>
        <lineBasicMaterial color={selected ? "#ffaa00" : "#5a8ab9"} />
      </lineSegments>
    </group>
  );
}

function BeamMesh({
  p1, p2, radius, color, opacity, wireframe, onClick, onPointerOver, onPointerOut, onDoubleClick,
}: {
  p1: [number, number, number]; p2: [number, number, number];
  radius: number; color: string; opacity: number; wireframe: boolean;
  onClick: (e: any) => void;
  onPointerOver?: (e: any) => void;
  onPointerOut?: (e: any) => void;
  onDoubleClick?: (e: any) => void;
}) {
  const a = new THREE.Vector3(...p1);
  const b = new THREE.Vector3(...p2);
  const dir = new THREE.Vector3().subVectors(b, a);
  const length = dir.length();
  const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
  const quat = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    dir.clone().normalize(),
  );
  return (
    <mesh
      position={mid.toArray()}
      quaternion={[quat.x, quat.y, quat.z, quat.w]}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
    >
      <cylinderGeometry args={[radius, radius, length, 12]} />
      <meshStandardMaterial
        color={color}
        transparent={opacity < 1 || wireframe}
        opacity={wireframe ? 0.0 : opacity}
        wireframe={wireframe}
        metalness={0.3}
        roughness={0.5}
      />
      {wireframe && (
        <lineSegments>
          <edgesGeometry args={[new THREE.CylinderGeometry(radius, radius, length, 12)]} />
          <lineBasicMaterial color={color} />
        </lineSegments>
      )}
    </mesh>
  );
}

function ShellMesh({
  pts, color, selected, opacity, wireframe, onClick, onPointerOver, onPointerOut, onDoubleClick,
}: {
  pts: [number, number, number][]; color: string; selected: boolean;
  opacity: number; wireframe: boolean;
  onClick: (e: any) => void;
  onPointerOver?: (e: any) => void;
  onPointerOut?: (e: any) => void;
  onDoubleClick?: (e: any) => void;
}) {
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const v = new Float32Array([
      ...pts[0], ...pts[1], ...pts[2],
      ...pts[0], ...pts[2], ...pts[3],
    ]);
    g.setAttribute("position", new THREE.BufferAttribute(v, 3));
    g.computeVertexNormals();
    return g;
  }, [pts]);
  const edgeGeom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const arr = new Float32Array([
      ...pts[0], ...pts[1],
      ...pts[1], ...pts[2],
      ...pts[2], ...pts[3],
      ...pts[3], ...pts[0],
    ]);
    g.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    return g;
  }, [pts]);
  return (
    <group onClick={onClick} onDoubleClick={onDoubleClick} onPointerOver={onPointerOver} onPointerOut={onPointerOut}>
      <mesh geometry={geom}>
        <meshStandardMaterial
          color={color}
          side={THREE.DoubleSide}
          transparent={opacity < 1 || wireframe}
          opacity={wireframe ? 0 : opacity}
          metalness={0.1}
          roughness={0.6}
          wireframe={wireframe}
        />
      </mesh>
      <lineSegments geometry={edgeGeom}>
        <lineBasicMaterial color={selected ? "#ffaa00" : "#5a8ab9"} />
      </lineSegments>
    </group>
  );
}

function SolidMesh({
  pts, color, selected, opacity, wireframe, onClick, onPointerOver, onPointerOut, onDoubleClick,
}: {
  pts: [number, number, number][]; color: string; selected: boolean;
  opacity: number; wireframe: boolean;
  onClick: (e: any) => void;
  onPointerOver?: (e: any) => void;
  onPointerOut?: (e: any) => void;
  onDoubleClick?: (e: any) => void;
}) {
  const faces = [
    [0, 1, 2, 3], [4, 5, 6, 7],
    [0, 1, 5, 4], [2, 3, 7, 6],
    [1, 2, 6, 5], [0, 3, 7, 4],
  ];
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const tris: number[] = [];
    for (const f of faces) {
      const [a, b, c, d] = f;
      tris.push(...pts[a], ...pts[b], ...pts[c], ...pts[a], ...pts[c], ...pts[d]);
    }
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(tris), 3));
    g.computeVertexNormals();
    return g;
  }, [pts]);
  const edgeGeom = useMemo(() => {
    const e: number[] = [];
    const pairs = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4],
                   [0, 4], [1, 5], [2, 6], [3, 7]];
    for (const [a, b] of pairs) e.push(...pts[a], ...pts[b]);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(e), 3));
    return g;
  }, [pts]);
  return (
    <group onClick={onClick} onDoubleClick={onDoubleClick} onPointerOver={onPointerOver} onPointerOut={onPointerOut}>
      <mesh geometry={geom}>
        <meshStandardMaterial
          color={color}
          transparent={opacity < 1 || wireframe}
          opacity={wireframe ? 0 : opacity}
          wireframe={wireframe}
          metalness={0.2}
          roughness={0.6}
        />
      </mesh>
      <lineSegments geometry={edgeGeom}>
        <lineBasicMaterial color={selected ? "#ffaa00" : "#5a8ab9"} />
      </lineSegments>
    </group>
  );
}

function TriMesh({
  pts, color, selected, opacity, wireframe, onClick, onPointerOver, onPointerOut, onDoubleClick,
}: {
  pts: [number, number, number][]; color: string; selected: boolean;
  opacity: number; wireframe: boolean;
  onClick: (e: any) => void;
  onPointerOver?: (e: any) => void;
  onPointerOut?: (e: any) => void;
  onDoubleClick?: (e: any) => void;
}) {
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(
      new Float32Array([...pts[0], ...pts[1], ...pts[2]]), 3));
    g.computeVertexNormals();
    return g;
  }, [pts]);
  const edgeGeom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(
      new Float32Array([
        ...pts[0], ...pts[1],
        ...pts[1], ...pts[2],
        ...pts[2], ...pts[0],
      ]), 3));
    return g;
  }, [pts]);
  return (
    <group onClick={onClick} onDoubleClick={onDoubleClick} onPointerOver={onPointerOver} onPointerOut={onPointerOut}>
      <mesh geometry={geom}>
        <meshStandardMaterial
          color={color}
          side={THREE.DoubleSide}
          transparent={opacity < 1 || wireframe}
          opacity={wireframe ? 0 : opacity}
          metalness={0.1}
          roughness={0.6}
          wireframe={wireframe}
        />
      </mesh>
      <lineSegments geometry={edgeGeom}>
        <lineBasicMaterial color={selected ? "#ffaa00" : "#5a8ab9"} />
      </lineSegments>
    </group>
  );
}
