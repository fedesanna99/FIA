/**
 * IsosurfaceLayer — render dei triangoli iso-superficie 3D nel Viewport (BL-7).
 *
 * Legge `isosurfaceData` dal resultsStore (popolato dal IsosurfacePanel).
 * Per ogni livello, costruisce una mesh con colore dal colormap jet, semi-trasparente
 * per permettere il pick degli elementi sottostanti.
 */
import { useMemo } from "react";
import * as THREE from "three";
import { useResultsStore } from "../../store/resultsStore";
import { jetHex } from "../../utils/colormap";

export function IsosurfaceLayer() {
  const data = useResultsStore((s) => s.isosurfaceData);
  const show = useResultsStore((s) => s.showIsosurfaces);

  // Range valori per normalizzare il colormap
  const range = useMemo(() => {
    if (!data || data.levels.length === 0) return { min: 0, max: 1 };
    const ls = data.levels;
    return { min: Math.min(...ls), max: Math.max(...ls) };
  }, [data]);

  // Pre-costruisco geometrie per ciascun livello
  const layers = useMemo(() => {
    if (!data) return [];
    return data.levels.map((lvl) => {
      const key = String(lvl);
      const tris = data.triangles_per_level[key] ?? [];
      const verts: number[] = [];
      for (const t of tris) {
        verts.push(...t.p1, ...t.p2, ...t.p3);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(verts), 3));
      g.computeVertexNormals();
      const t = (lvl - range.min) / Math.max(range.max - range.min, 1e-12);
      return { lvl, key, geometry: g, color: jetHex(t), n_tri: tris.length };
    });
  }, [data, range]);

  if (!show || !data || layers.length === 0) return null;

  return (
    <group>
      {layers.map(({ key, geometry, color, n_tri }) =>
        n_tri > 0 ? (
          <mesh key={key} geometry={geometry}>
            <meshStandardMaterial
              color={color}
              side={THREE.DoubleSide}
              transparent
              opacity={0.55}
              metalness={0.2}
              roughness={0.5}
              depthWrite={false}
            />
          </mesh>
        ) : null,
      )}
    </group>
  );
}
