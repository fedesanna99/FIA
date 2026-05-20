import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid, GizmoHelper, GizmoViewport } from "@react-three/drei";
import { Suspense, useMemo } from "react";
import * as THREE from "three";
import { useModelStore } from "../../store/modelStore";
import { useAnalysisStore } from "../../store/analysisStore";
import { useResultsStore } from "../../store/resultsStore";
import { modelBounds } from "../../utils/geometry";
import { NodeRenderer } from "./NodeRenderer";
import { ElementRenderer } from "./ElementRenderer";
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

export function Viewport3D() {
  const model = useModelStore((s) => s.model);
  const { showGrid, viewportMode, projection } = useAnalysisStore();
  const { staticResults, modalResults, dynamicResults, showDeformed, showStressColormap } = useResultsStore();

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

  return (
    <div className="absolute inset-0">
      <Canvas
        key={projection}
        orthographic={projection === "orthographic"}
        camera={cameraConfig}
        gl={{ antialias: true, alpha: false }}
        onCreated={({ scene }) => { scene.background = new THREE.Color("#1a1f2e"); }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 20, 10]} intensity={0.7} />
        <directionalLight position={[-10, -10, -5]} intensity={0.3} />

        <Suspense fallback={null}>
          {model && (
            <>
              <ClickPlane />
              <ElementRenderer mode={viewportMode} colormap={showStressColormap} />
              <NodeRenderer />
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
              cellColor="#2a3040"
              sectionColor="#3a4050"
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
        />
        <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
          <GizmoViewport
            axisColors={["#ff4444", "#00ff88", "#00d4ff"]}
            labelColor="#e8eaed"
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
          <div className="text-ink-dim text-sm">
            Seleziona o crea un modello FEA per iniziare
          </div>
        </div>
      )}

      <DynamicTimelineHUD />
      <StaleResultsBanner />
      <ToolHUD />
      <HoverTooltip />
    </div>
  );
}
