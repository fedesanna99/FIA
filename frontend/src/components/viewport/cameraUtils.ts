/**
 * cameraUtils (v1.6 Sprint 0 · B15) — helpers programmatici per orbitare/
 * centrare la camera del viewport Three.js. Per ora due funzioni:
 *
 * - modelBoundsFromNodes(nodes): bbox isotropo
 * - fitCameraToModel(camera, controls, nodes, duration): animazione
 *   ease-out cubic verso posizione iso 2.5× max-dim del bbox.
 *
 * Il primo "auto-fit" al caricamento di un modello e' gestito dal `key`
 * dinamico del Canvas (che include model.id) — il remount riparte da
 * cameraConfig fresh. Queste utility servono per:
 *   1. Re-fit manuale tramite comando palette ("Vai a · Fit camera")
 *   2. Bottone HUD "centra modello" (futuro)
 */
import * as THREE from "three";


export interface NodeLike {
  x: number;
  y: number;
  z: number;
}


export interface OrbitControlsLike {
  target: THREE.Vector3;
  update(): void;
}


/** Calcola bbox isotropo + centro + dimensione max. */
export function modelBoundsFromNodes(nodes: NodeLike[]): {
  center: THREE.Vector3;
  size: THREE.Vector3;
  maxDim: number;
} {
  if (nodes.length === 0) {
    return {
      center: new THREE.Vector3(0, 0, 0),
      size: new THREE.Vector3(1, 1, 1),
      maxDim: 1,
    };
  }
  const min = new THREE.Vector3(Infinity, Infinity, Infinity);
  const max = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
  for (const n of nodes) {
    if (n.x < min.x) min.x = n.x;
    if (n.y < min.y) min.y = n.y;
    if (n.z < min.z) min.z = n.z;
    if (n.x > max.x) max.x = n.x;
    if (n.y > max.y) max.y = n.y;
    if (n.z > max.z) max.z = n.z;
  }
  const center = new THREE.Vector3().addVectors(min, max).multiplyScalar(0.5);
  const size = new THREE.Vector3().subVectors(max, min);
  const maxDim = Math.max(size.x, size.y, size.z, 1);
  return { center, size, maxDim };
}


/**
 * Anima la camera + controls verso una vista iso-centrata sul modello.
 * `durationMs=400` ease-out cubic. Sicuro se controls undefined (non-orbit).
 */
export function fitCameraToModel(
  camera: THREE.Camera,
  controls: OrbitControlsLike | undefined,
  nodes: NodeLike[],
  durationMs = 400,
): void {
  if (nodes.length === 0) return;

  const { center, maxDim } = modelBoundsFromNodes(nodes);

  // Posizione camera iso (3/4 view): distanza = 2.5× max-dim
  const dist = maxDim * 2.5;
  const targetPos = new THREE.Vector3(
    center.x + dist * 0.7,
    center.y + dist * 0.5,
    center.z + dist * 0.7,
  );

  const startPos = camera.position.clone();
  const startTarget = controls?.target.clone() ?? new THREE.Vector3();
  const startTime =
    typeof performance !== "undefined" ? performance.now() : Date.now();

  function animate() {
    const now =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    const t = Math.min((now - startTime) / durationMs, 1);
    // ease-out cubic
    const ease = 1 - Math.pow(1 - t, 3);
    camera.position.lerpVectors(startPos, targetPos, ease);
    if (controls) {
      controls.target.lerpVectors(startTarget, center, ease);
      controls.update();
    }
    if (t < 1 && typeof requestAnimationFrame !== "undefined") {
      requestAnimationFrame(animate);
    }
  }
  animate();
}
