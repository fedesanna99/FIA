/**
 * IsosurfaceLayer — render dei triangoli iso-superficie 3D nel Viewport (BL-7).
 *
 * Legge `isosurfaceData` dal resultsStore (popolato dal IsosurfacePanel).
 * Per ogni livello, costruisce una mesh con colore dal colormap jet, semi-trasparente
 * per permettere il pick degli elementi sottostanti.
 *
 * v3.3.0 audit-fix L3.3-P0-1: useDisposableArray per cleanup GPU geometry.
 * v3.3.0 audit-fix L3.3-P1-13: Math.min/max(...) sostituito con reduce.
 */
import { useMemo } from "react";
import * as THREE from "three";
import { useResultsStore } from "../../store/resultsStore";
import { jetHex } from "../../utils/colormap";
import { useDisposableArray } from "./useDisposableGeometry";

export function IsosurfaceLayer() {
  const data = useResultsStore((s) => s.isosurfaceData);
  const show = useResultsStore((s) => s.showIsosurfaces);

  // Range valori per normalizzare il colormap (no spread su array dinamici)
  const range = useMemo(() => {
    if (!data || data.levels.length === 0) return { min: 0, max: 1 };
    let mn = Infinity;
    let mx = -Infinity;
    for (const lvl of data.levels) {
      if (lvl < mn) mn = lvl;
      if (lvl > mx) mx = lvl;
    }
    return { min: mn, max: mx };
  }, [data]);

  // Pre-costruisco geometrie per ciascun livello, con dispose automatico.
  const geometries = useDisposableArray<THREE.BufferGeometry>(() => {
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
      return g;
    });
  }, [data]);

  // Metadati per il render (colori + count), accoppiati a geometries.
  const layers = useMemo(() => {
    if (!data) return [];
    return data.levels.map((lvl, i) => {
      const key = String(lvl);
      const tris = data.triangles_per_level[key] ?? [];
      const t = (lvl - range.min) / Math.max(range.max - range.min, 1e-12);
      return { key, color: jetHex(t), n_tri: tris.length, geometry: geometries[i] };
    });
  }, [data, range, geometries]);

  if (!show || !data || layers.length === 0) return null;

  return (
    <group>
      {layers.map(({ key, geometry, color, n_tri }) =>
        n_tri > 0 && geometry ? (
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
