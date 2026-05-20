import { useMemo } from "react";
import * as THREE from "three";
import { useModelStore } from "../../store/modelStore";
import { useResultsStore } from "../../store/resultsStore";
import { useAnalysisStore } from "../../store/analysisStore";
import { modelBounds } from "../../utils/geometry";

/**
 * Disegna nei baricentri degli elementi 2D (T3, shell) due crocette
 * proporzionali a σ1, σ2 ruotate secondo le direzioni principali.
 *
 * Convenzione: rosso = trazione, blu = compressione.
 */
export function PrincipalStressOverlay() {
  const model = useModelStore((s) => s.model)!;
  const staticRes = useResultsStore((s) => s.staticResults);
  const showPrincipals = useAnalysisStore((s) => s.showPrincipals);
  const bSize = useMemo(() => modelBounds(model).size, [model]);

  const geometry = useMemo(() => {
    if (!staticRes || !showPrincipals) return null;
    const stresses = staticRes.element_stresses.filter(
      (s) => s.principal_dir1 && s.principal_dir2 && s.centroid
    );
    if (stresses.length === 0) return null;
    const maxAbs = Math.max(
      ...stresses.map((s) => Math.max(Math.abs(s.sigma_max), Math.abs(s.sigma_min))),
      1,
    );
    const scaleLen = bSize * 0.06;
    const tensionPositions: number[] = [];
    const compressionPositions: number[] = [];
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
      (s.sigma_max >= 0 ? tensionPositions : compressionPositions).push(...seg1);
      (s.sigma_min >= 0 ? tensionPositions : compressionPositions).push(...seg2);
    }
    const tensionGeom = new THREE.BufferGeometry();
    tensionGeom.setAttribute("position", new THREE.BufferAttribute(new Float32Array(tensionPositions), 3));
    const compGeom = new THREE.BufferGeometry();
    compGeom.setAttribute("position", new THREE.BufferAttribute(new Float32Array(compressionPositions), 3));
    return { tension: tensionGeom, compression: compGeom };
  }, [model, staticRes, bSize, showPrincipals]);

  if (!geometry) return null;

  return (
    <>
      <lineSegments geometry={geometry.tension}>
        <lineBasicMaterial color="#ff4444" linewidth={2} />
      </lineSegments>
      <lineSegments geometry={geometry.compression}>
        <lineBasicMaterial color="#00d4ff" linewidth={2} />
      </lineSegments>
    </>
  );
}
