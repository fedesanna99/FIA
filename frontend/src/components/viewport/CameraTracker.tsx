/**
 * CameraTracker (v2.5.7 cluster A T4, BUG-043).
 *
 * Sub-componente R3F (dentro `<Canvas>`) che osserva la distanza camera-target
 * e pubblica `metersPerScreenHeight` allo store `viewportCameraStore`. Update
 * throttled a 10Hz per evitare re-render eccessivi della HUD.
 *
 * `ScaleIndicator` (fuori dal Canvas) legge dallo store e sceglie il break di
 * scala in base al valore — non più hardcoded sui bounding box del modello.
 */
import { useEffect, useRef } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import type { PerspectiveCamera, OrthographicCamera } from "three";
import { useViewportCameraStore } from "../../store/viewportCameraStore";

const UPDATE_INTERVAL_MS = 100; // 10Hz

export function CameraTracker(): null {
  const camera = useThree((s) => s.camera);
  const set = useViewportCameraStore((s) => s.setMetersPerScreenHeight);
  const lastUpdateRef = useRef(0);

  useEffect(() => {
    return () => {
      set(null);
    };
  }, [set]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime * 1000;
    if (t - lastUpdateRef.current < UPDATE_INTERVAL_MS) return;
    lastUpdateRef.current = t;

    const metersPerScreenHeight = computeMetersPerScreenHeight(camera);
    if (Number.isFinite(metersPerScreenHeight) && metersPerScreenHeight > 0) {
      set(metersPerScreenHeight);
    }
  });

  return null;
}

/**
 * Esportata per test. Per camera prospettica usa `2·distance·tan(fov/2)`.
 * Per camera ortografica usa `(top - bottom) / zoom`.
 */
export function computeMetersPerScreenHeight(
  camera: PerspectiveCamera | OrthographicCamera | { isPerspectiveCamera?: boolean; isOrthographicCamera?: boolean; [k: string]: unknown },
): number {
  const perspectiveCam = camera as PerspectiveCamera;
  const orthographicCam = camera as OrthographicCamera;
  if ((camera as { isPerspectiveCamera?: boolean }).isPerspectiveCamera) {
    const fovRad = ((perspectiveCam.fov ?? 45) * Math.PI) / 180;
    const distance = perspectiveCam.position.length();
    return 2 * distance * Math.tan(fovRad / 2);
  }
  if ((camera as { isOrthographicCamera?: boolean }).isOrthographicCamera) {
    const zoom = orthographicCam.zoom || 1;
    const height = (orthographicCam.top - orthographicCam.bottom) / zoom;
    return Math.abs(height);
  }
  // Fallback (camera non riconosciuta): nessun aggiornamento
  return NaN;
}
