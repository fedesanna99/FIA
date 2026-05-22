import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useModelStore } from "../../store/modelStore";
import { useResultsStore } from "../../store/resultsStore";
import { useUIStore } from "../../store/uiStore";
import { nodeById, modelBounds } from "../../utils/geometry";
import { jetHex } from "../../utils/colormap";
import type { ViewportMode } from "../../store/analysisStore";
import {
  composeLineElementInstanceMatrix,
  createLineElementInstanceIndex,
  isLineElement,
  lineElementEndpoints,
  lineElementInstanceColor,
  type LineElementInstance,
} from "../../viewport-engine/lineElementInstances";
import {
  createSurfaceElementGeometry,
  isSurfaceElement,
} from "../../viewport-engine/surfaceElementGeometry";
import {
  createSolidElementGeometry,
  isSolidElement,
} from "../../viewport-engine/solidElementGeometry";

interface Props {
  mode: ViewportMode;
  colormap: boolean;
}

export function EngineElementRenderer({ mode, colormap }: Props) {
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

  const lineElementInstances = useMemo(() => {
    const instances: LineElementInstance[] = [];
    for (const el of model.elements) {
      if (!isLineElement(el)) continue;
      const endpoints = lineElementEndpoints(el, byId);
      if (!endpoints) continue;

      const selected = selectedIds.has(el.id);
      const isCable = el.type === "cable2d" || el.type === "cable3d";
      const pretensioned = isCable && (el as any).pretension && (el as any).pretension > 0;
      const baseColor = isCable
        ? pretensioned ? "#3ec46d" : "#888a92"
        : getColor(el.id, "#4a90d9");
      const radius = isCable
        ? beamRadius * 0.35
        : beamRadius * (el.type.startsWith("truss") ? 0.7 : 1.0);

      instances.push({
        element: el,
        ...endpoints,
        radius,
        color: selected ? "#ffaa00" : baseColor,
      });
    }
    return instances;
  }, [model.elements, byId, selectedIds, beamRadius, colormap, stressByEl, maxStress]);

  const surfaceGeometry = useMemo(() => createSurfaceElementGeometry(
    model.elements,
    byId,
    (el) => selectedIds.has(el.id) ? "#ffaa00" : getColor(el.id, "#2a6099"),
  ), [model.elements, byId, selectedIds, colormap, stressByEl, maxStress]);

  const solidGeometry = useMemo(() => createSolidElementGeometry(
    model.elements,
    byId,
    (el) => selectedIds.has(el.id) ? "#ffaa00" : getColor(el.id, "#3a70b9"),
  ), [model.elements, byId, selectedIds, colormap, stressByEl, maxStress]);

  return (
    <group>
      <LineElementInstances
        instances={lineElementInstances}
        opacity={opacity}
        wireframe={wireframe}
        onClick={(el, ev) => { ev.stopPropagation(); selectElement(el.id, ev.shiftKey); }}
        onDoubleClick={(el, ev) => { ev.stopPropagation(); openEditElement(el.id); }}
        onPointerMove={(el, ev) => {
          ev.stopPropagation();
          hoverIn({ id: el.id, type: el.type, nodes: el.nodes });
        }}
        onPointerOut={hoverOut}
      />
      <SurfaceElementMesh
        geometry={surfaceGeometry.geometry}
        edgeGeometry={surfaceGeometry.edgeGeometry}
        elementIdsByTriangle={surfaceGeometry.elementIdsByTriangle}
        elements={model.elements}
        opacity={opacity}
        wireframe={wireframe}
        onClick={(el, ev) => { ev.stopPropagation(); selectElement(el.id, ev.shiftKey); }}
        onDoubleClick={(el, ev) => { ev.stopPropagation(); openEditElement(el.id); }}
        onPointerMove={(el, ev) => {
          ev.stopPropagation();
          hoverIn({ id: el.id, type: el.type, nodes: el.nodes });
        }}
        onPointerOut={hoverOut}
      />
      <SolidElementMesh
        geometry={solidGeometry.geometry}
        edgeGeometry={solidGeometry.edgeGeometry}
        elementIdsByTriangle={solidGeometry.elementIdsByTriangle}
        elements={model.elements}
        opacity={opacity}
        wireframe={wireframe}
        onClick={(el, ev) => { ev.stopPropagation(); selectElement(el.id, ev.shiftKey); }}
        onDoubleClick={(el, ev) => { ev.stopPropagation(); openEditElement(el.id); }}
        onPointerMove={(el, ev) => {
          ev.stopPropagation();
          hoverIn({ id: el.id, type: el.type, nodes: el.nodes });
        }}
        onPointerOut={hoverOut}
      />
      {model.elements.map((el) => {
        if (isLineElement(el) || isSurfaceElement(el) || isSolidElement(el)) return null;
        return null;
      })}
    </group>
  );
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Cable line â€” linea sottile per cavi (BL-1)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function LineElementInstances({
  instances,
  opacity,
  wireframe,
  onClick,
  onDoubleClick,
  onPointerMove,
  onPointerOut,
}: {
  instances: LineElementInstance[];
  opacity: number;
  wireframe: boolean;
  onClick: (el: LineElementInstance["element"], e: any) => void;
  onDoubleClick: (el: LineElementInstance["element"], e: any) => void;
  onPointerMove: (el: LineElementInstance["element"], e: any) => void;
  onPointerOut: () => void;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const hoverElementIdRef = useRef<number | null>(null);
  const elementIdsByInstance = useMemo(() => createLineElementInstanceIndex(instances), [instances]);
  const elementsById = useMemo(
    () => new Map(instances.map((instance) => [instance.element.id, instance.element])),
    [instances],
  );

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const matrix = new THREE.Matrix4();
    const color = new THREE.Color();
    instances.forEach((instance, index) => {
      composeLineElementInstanceMatrix(instance.p1, instance.p2, instance.radius, matrix);
      mesh.setMatrixAt(index, matrix);
      mesh.setColorAt(index, lineElementInstanceColor(instance.color, color));
    });
    mesh.count = instances.length;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [instances]);

  const elementFromInstance = (instanceId: number | undefined) => {
    if (instanceId === undefined) return null;
    const elementId = elementIdsByInstance[instanceId];
    return elementsById.get(elementId) ?? null;
  };

  if (instances.length === 0) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, instances.length]}
      onClick={(ev) => {
        const element = elementFromInstance(ev.instanceId);
        if (!element) return;
        onClick(element, ev);
      }}
      onDoubleClick={(ev) => {
        const element = elementFromInstance(ev.instanceId);
        if (!element) return;
        onDoubleClick(element, ev);
      }}
      onPointerMove={(ev) => {
        const element = elementFromInstance(ev.instanceId);
        if (!element) return;
        ev.stopPropagation();
        if (hoverElementIdRef.current === element.id) return;
        hoverElementIdRef.current = element.id;
        onPointerMove(element, ev);
      }}
      onPointerOut={() => {
        hoverElementIdRef.current = null;
        onPointerOut();
      }}
    >
      <cylinderGeometry args={[1, 1, 1, 12]} />
      <meshStandardMaterial
        vertexColors
        transparent={opacity < 1 || wireframe}
        opacity={wireframe ? 0.85 : opacity}
        wireframe={wireframe}
        metalness={0.3}
        roughness={0.5}
      />
    </instancedMesh>
  );
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Tet mesh â€” tetraedro a 4 facce triangolari (BL-3)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function SurfaceElementMesh({
  geometry,
  edgeGeometry,
  elementIdsByTriangle,
  elements,
  opacity,
  wireframe,
  onClick,
  onDoubleClick,
  onPointerMove,
  onPointerOut,
}: {
  geometry: THREE.BufferGeometry;
  edgeGeometry: THREE.BufferGeometry;
  elementIdsByTriangle: number[];
  elements: LineElementInstance["element"][];
  opacity: number;
  wireframe: boolean;
  onClick: (el: LineElementInstance["element"], e: any) => void;
  onDoubleClick: (el: LineElementInstance["element"], e: any) => void;
  onPointerMove: (el: LineElementInstance["element"], e: any) => void;
  onPointerOut: () => void;
}) {
  const hoverElementIdRef = useRef<number | null>(null);
  const elementsById = useMemo(() => new Map(elements.map((element) => [element.id, element])), [elements]);
  const hasFaces = (geometry.getAttribute("position")?.count ?? 0) > 0;
  const hasEdges = (edgeGeometry.getAttribute("position")?.count ?? 0) > 0;
  if (!hasFaces && !hasEdges) return null;

  const elementFromFace = (faceIndex: number | null | undefined) => {
    if (faceIndex == null) return null;
    const elementId = elementIdsByTriangle[faceIndex];
    return elementsById.get(elementId) ?? null;
  };

  return (
    <group>
      {hasFaces && (
        <mesh
          geometry={geometry}
          onClick={(ev) => {
            const element = elementFromFace(ev.faceIndex);
            if (!element) return;
            onClick(element, ev);
          }}
          onDoubleClick={(ev) => {
            const element = elementFromFace(ev.faceIndex);
            if (!element) return;
            onDoubleClick(element, ev);
          }}
          onPointerMove={(ev) => {
            const element = elementFromFace(ev.faceIndex);
            if (!element) return;
            ev.stopPropagation();
            if (hoverElementIdRef.current === element.id) return;
            hoverElementIdRef.current = element.id;
            onPointerMove(element, ev);
          }}
          onPointerOut={() => {
            hoverElementIdRef.current = null;
            onPointerOut();
          }}
        >
          <meshStandardMaterial
            vertexColors
            side={THREE.DoubleSide}
            transparent={opacity < 1 || wireframe}
            opacity={wireframe ? 0 : opacity}
            metalness={0.1}
            roughness={0.6}
            wireframe={wireframe}
          />
        </mesh>
      )}
      {hasEdges && (
        <lineSegments geometry={edgeGeometry}>
          <lineBasicMaterial color="#5a8ab9" />
        </lineSegments>
      )}
    </group>
  );
}

function SolidElementMesh({
  geometry,
  edgeGeometry,
  elementIdsByTriangle,
  elements,
  opacity,
  wireframe,
  onClick,
  onDoubleClick,
  onPointerMove,
  onPointerOut,
}: {
  geometry: THREE.BufferGeometry;
  edgeGeometry: THREE.BufferGeometry;
  elementIdsByTriangle: number[];
  elements: LineElementInstance["element"][];
  opacity: number;
  wireframe: boolean;
  onClick: (el: LineElementInstance["element"], e: any) => void;
  onDoubleClick: (el: LineElementInstance["element"], e: any) => void;
  onPointerMove: (el: LineElementInstance["element"], e: any) => void;
  onPointerOut: () => void;
}) {
  const hoverElementIdRef = useRef<number | null>(null);
  const elementsById = useMemo(() => new Map(elements.map((element) => [element.id, element])), [elements]);
  const hasFaces = (geometry.getAttribute("position")?.count ?? 0) > 0;
  const hasEdges = (edgeGeometry.getAttribute("position")?.count ?? 0) > 0;
  if (!hasFaces && !hasEdges) return null;

  const elementFromFace = (faceIndex: number | null | undefined) => {
    if (faceIndex == null) return null;
    const elementId = elementIdsByTriangle[faceIndex];
    return elementsById.get(elementId) ?? null;
  };

  return (
    <group>
      {hasFaces && (
        <mesh
          geometry={geometry}
          onClick={(ev) => {
            const element = elementFromFace(ev.faceIndex);
            if (!element) return;
            onClick(element, ev);
          }}
          onDoubleClick={(ev) => {
            const element = elementFromFace(ev.faceIndex);
            if (!element) return;
            onDoubleClick(element, ev);
          }}
          onPointerMove={(ev) => {
            const element = elementFromFace(ev.faceIndex);
            if (!element) return;
            ev.stopPropagation();
            if (hoverElementIdRef.current === element.id) return;
            hoverElementIdRef.current = element.id;
            onPointerMove(element, ev);
          }}
          onPointerOut={() => {
            hoverElementIdRef.current = null;
            onPointerOut();
          }}
        >
          <meshStandardMaterial
            vertexColors
            transparent={opacity < 1 || wireframe}
            opacity={wireframe ? 0 : opacity}
            wireframe={wireframe}
            metalness={0.2}
            roughness={0.6}
          />
        </mesh>
      )}
      {hasEdges && (
        <lineSegments geometry={edgeGeometry}>
          <lineBasicMaterial color="#5a8ab9" />
        </lineSegments>
      )}
    </group>
  );
}


