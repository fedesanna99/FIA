/**
 * viewportCameraStore (v2.5.7 cluster A T4 + T5).
 *
 * State condiviso fra `CameraTracker` (sub-componente R3F dentro Canvas) e
 * componenti UI HUD esterni al Canvas (es. `ScaleIndicator`). Permette di
 * derivare scala dinamica + auto-fit senza dover passare ref/prop chain.
 *
 * Update throttled a 10Hz dal CameraTracker per evitare re-render eccessivi.
 */
import { create } from "zustand";

interface ViewportCameraState {
  /**
   * Approssimazione "quanti metri reali entrano nella altezza viewport" alla
   * distanza camera attuale. Usato da ScaleIndicator per scegliere il break.
   * Default fallback su null finché CameraTracker non ha pubblicato.
   */
  metersPerScreenHeight: number | null;
  setMetersPerScreenHeight: (m: number | null) => void;
}

export const useViewportCameraStore = create<ViewportCameraState>((set) => ({
  metersPerScreenHeight: null,
  setMetersPerScreenHeight: (m) => set({ metersPerScreenHeight: m }),
}));
