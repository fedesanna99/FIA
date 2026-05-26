import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid, GizmoHelper, GizmoViewport } from "@react-three/drei";
import { Suspense, useMemo } from "react";
import * as THREE from "three";
import { useModelStore } from "../../store/modelStore";
import { useAnalysisStore } from "../../store/analysisStore";
import { useResultsStore } from "../../store/resultsStore";
import { useThemeStore } from "../../store/themeStore";
import { modelBounds } from "../../utils/geometry";
import { NodeRenderer } from "./NodeRenderer";
import { ElementRenderer } from "./ElementRenderer";
import { EngineNodeRenderer } from "./EngineNodeRenderer";
import { EngineElementRenderer } from "./EngineElementRenderer";
import { LoadRenderer } from "./LoadRenderer";
import { BCRenderer } from "./BCRenderer";
import { DeformedShape } from "./DeformedShape";
import { ModeShapeViewer } from "./ModeShapeViewer";
import { ColorLegend } from "./ColorLegend";
import { HoverTooltip } from "./HoverTooltip";
import { InternalForceDiagram } from "./InternalForceDiagram";
import { DynamicAnimation } from "./DynamicAnimation";
import { DynamicTimelineHUD } from "./DynamicTimelineHUD";
import { StaleResultsBanner } from "./StaleResultsBanner";
import { PrincipalStressOverlay } from "./PrincipalStressOverlay";
import { IsosurfaceLayer } from "./IsosurfaceLayer";
import { IsosurfaceLegend } from "./IsosurfaceLegend";
import { ClickPlane } from "./ClickPlane";
import { ToolHUD } from "./ToolHUD";
import { ViewportHud } from "./ViewportHud";
import { ScaleIndicator } from "./ScaleIndicator";
import { CameraTracker } from "./CameraTracker";
import { EmptyModelOverlay } from "./EmptyModelOverlay";

export function Viewport3D() {
  const model = useModelStore((s) => s.model);
  const { showGrid, viewportMode, projection, useViewportEngine } = useAnalysisStore();
  const { staticResults, modalResults, dynamicResults, showDeformed, showStressColormap } = useResultsStore();
  const theme = useThemeStore((s) => s.resolved);

  const bounds = useMemo(() => modelBounds(model), [model]);
  const cameraPos: [number, number, number] = useMemo(() => {
    const d = bounds.size * 1.8;
    return [
      bounds.center[0] + d,
      bounds.center[1] + d * 0.7,
      bounds.center[2] + d,
    ];
  }, [bounds]);

  const cameraConfig = projection === "orthographic"
    ? { position: cameraPos, zoom: 100, near: -10000, far: 10000 } as any
    : { position: cameraPos, fov: 45, near: 0.01, far: 10000 };

  // alpha.29: viewport theme-aware (light = warm neutral, dark = neutro scuro)
  // — il `key` include theme cosi' il Canvas remount e il `scene.background`
  // viene riapplicato (R3F non re-invoca onCreated senza remount).
  const sceneBg = useMemo(
    () => (theme === "light" ? "#fafaf8" : "#131316"),
    [theme],
  );
  const gridColors = useMemo(
    () =>
      theme === "light"
        ? { cell: "#e8e6dd", section: "#c8c5b8" }
        : { cell: "#2a3040", section: "#3a4050" },
    [theme],
  );

  return (
    <div className="absolute inset-0" onContextMenu={(e) => e.preventDefault()}>
      <Canvas
        // v1.6 S0 · B15: includere model?.id nel key forza remount del Canvas
        // quando si carica un modello diverso → la camera si ri-inizializza
        // con i bounds corretti del nuovo modello (auto-fit al primo render).
        key={`${projection}-${theme}-${model?.id ?? "empty"}`}
        orthographic={projection === "orthographic"}
        camera={cameraConfig}
        gl={{ antialias: true, alpha: false }}
        onCreated={({ scene }) => { scene.background = new THREE.Color(sceneBg); }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 20, 10]} intensity={0.7} />
        <directionalLight position={[-10, -10, -5]} intensity={0.3} />
        {/* v2.5.7 cluster A (BUG-043): pubblica metersPerScreenHeight allo
            store, throttled a 10Hz. ScaleIndicator legge dallo store e
            sceglie il break in 8 livelli dinamici vs camera zoom. */}
        <CameraTracker />

        <Suspense fallback={null}>
          {model && (
            <>
              <ClickPlane />
              {useViewportEngine ? (
                <>
                  <EngineElementRenderer mode={viewportMode} colormap={showStressColormap} />
                  <EngineNodeRenderer />
                </>
              ) : (
                <>
                  <ElementRenderer mode={viewportMode} colormap={showStressColormap} />
                  <NodeRenderer />
                </>
              )}
              <LoadRenderer />
              <BCRenderer />
              {showDeformed && staticResults && <DeformedShape />}
              {staticResults && <InternalForceDiagram component="N" />}
              {staticResults && <InternalForceDiagram component="V" />}
              {staticResults && <InternalForceDiagram component="M" />}
              {staticResults && <PrincipalStressOverlay />}
              <IsosurfaceLayer />
              {modalResults && <ModeShapeViewer />}
              {dynamicResults && <DynamicAnimation />}
            </>
          )}
          {showGrid && (
            <Grid
              args={[bounds.size * 4, bounds.size * 4]}
              cellSize={bounds.size / 10}
              sectionSize={bounds.size / 2}
              cellColor={gridColors.cell}
              sectionColor={gridColors.section}
              fadeDistance={bounds.size * 8}
              fadeStrength={1}
              infiniteGrid={false}
              position={[bounds.center[0], 0, bounds.center[2]]}
            />
          )}
        </Suspense>

        <OrbitControls
          target={bounds.center}
          makeDefault
          enableDamping dampingFactor={0.1}
          mouseButtons={{
            LEFT: THREE.MOUSE.ROTATE,
            MIDDLE: THREE.MOUSE.DOLLY,
            RIGHT: undefined as unknown as THREE.MOUSE,
          }}
        />
        <GizmoHelper alignment="bottom-right" margin={[80, 100]}>
          <GizmoViewport
            axisColors={["#e24b4a", "#3b8c2a", "#378add"]}
            labelColor={theme === "light" ? "#1a1a1a" : "#e8eaed"}
          />
        </GizmoHelper>
      </Canvas>

      {showStressColormap && staticResults && (
        <ColorLegend
          min={0}
          max={staticResults.max_stress}
          unit="Pa"
          title="σ Von Mises"
        />
      )}

      <IsosurfaceLegend />


      {!model && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-ink-3 text-sm">
            Seleziona o crea un modello FEA per iniziare
          </div>
        </div>
      )}

      <ViewportHud />
      <EmptyModelOverlay />
      <ScaleIndicator />
      <DynamicTimelineHUD />
      <StaleResultsBanner />
      <ToolHUD />
      <HoverTooltip />
    </div>
  );
}
