import { useMemo } from "react";
import * as THREE from "three";
import { useModelStore } from "../../store/modelStore";
import { useResultsStore } from "../../store/resultsStore";
import { useAnalysisStore } from "../../store/analysisStore";
import { modelBounds } from "../../utils/geometry";
import { useDisposableGeometry } from "./useDisposableGeometry";

/**
 * Disegna nei baricentri degli elementi 2D (T3, shell) due crocette
 * proporzionali a σ1, σ2 ruotate secondo le direzioni principali.
 *
 * Convenzione: rosso = trazione, blu = compressione.
 *
 * v3.3.0 audit-fix L3.3-P0-1: useDisposableGeometry (era leak useMemo puro).
 * v3.3.0 audit-fix L3.3-P1-13: rimosso Math.max(...spread) per stack overflow safety.
 */
export function PrincipalStressOverlay() {
  const model = useModelStore((s) => s.model)!;
  const staticRes = useResultsStore((s) => s.staticResults);
  const showPrincipals = useAnalysisStore((s) => s.showPrincipals);
  const bSize = useMemo(() => modelBounds(model).size, [model]);

  const active = staticRes && showPrincipals;

  const tensionGeometry = useDisposableGeometry(() => {
    if (!active) return new THREE.BufferGeometry();
    const positions = computePrincipals(model, staticRes!, bSize).tension;
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(positions), 3));
    return g;
  }, [active, model, staticRes, bSize]);

  const compressionGeometry = useDisposableGeometry(() => {
    if (!active) return new THREE.BufferGeometry();
    const positions = computePrincipals(model, staticRes!, bSize).compression;
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(positions), 3));
    return g;
  }, [active, model, staticRes, bSize]);

  if (!active) return null;

  return (
    <>
      <lineSegments geometry={tensionGeometry}>
        <lineBasicMaterial color="#ff4444" linewidth={2} />
      </lineSegments>
      <lineSegments geometry={compressionGeometry}>
        <lineBasicMaterial color="#00d4ff" linewidth={2} />
      </lineSegments>
    </>
  );
}


type ModelType = ReturnType<typeof useModelStore.getState>["model"];
type StaticResType = NonNullable<ReturnType<typeof useResultsStore.getState>["staticResults"]>;

function computePrincipals(model: NonNullable<ModelType>, staticRes: StaticResType, bSize: number) {
  const stresses = staticRes.element_stresses.filter(
    (s) => s.principal_dir1 && s.principal_dir2 && s.centroid
  );
  // L3.3-P1-13: reduce invece di spread (no stack overflow su N grande)
  let maxAbs = 1;
  for (const s of stresses) {
    const a = Math.abs(s.sigma_max);
    const b = Math.abs(s.sigma_min);
    if (a > maxAbs) maxAbs = a;
    if (b > maxAbs) maxAbs = b;
  }
  const scaleLen = bSize * 0.06;
  const tension: number[] = [];
  const compression: number[] = [];
  for (const s of stresses) {
    const c = s.centroid!;
    const d1 = s.principal_dir1!;
    const d2 = s.principal_dir2!;
    const len1 = (Math.abs(s.sigma_max) / maxAbs) * scaleLen;
    const len2 = (Math.abs(s.sigma_min) / maxAbs) * scaleLen;
    const half1 = [d1[0] * len1, d1[1] * len1, d1[2] * len1];
    const half2 = [d2[0] * len2, d2[1] * len2, d2[2] * len2];
    const seg1 = [
      c[0] - half1[0], c[1] - half1[1], c[2] - half1[2],
      c[0] + half1[0], c[1] + half1[1], c[2] + half1[2],
    ];
    const seg2 = [
      c[0] - half2[0], c[1] - half2[1], c[2] - half2[2],
      c[0] + half2[0], c[1] + half2[1], c[2] + half2[2],
    ];
    (s.sigma_max >= 0 ? tension : compression).push(...seg1);
    (s.sigma_min >= 0 ? tension : compression).push(...seg2);
  }
  return { tension, compression };
}
