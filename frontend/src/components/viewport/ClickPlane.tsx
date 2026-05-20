import { useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as THREE from "three";
import { useAnalysisStore } from "../../store/analysisStore";
import { useModelStore } from "../../store/modelStore";
import { modelsApi } from "../../api/client";
import { toast } from "../../store/toastStore";
import { modelBounds } from "../../utils/geometry";

/**
 * Plane invisibile su Z=0 che intercetta i click quando il tool "create_node" è attivo.
 * Snap-to-grid è applicato se attivo (arrotondamento alla risoluzione).
 */
export function ClickPlane() {
  const model = useModelStore((s) => s.model);
  const addNode = useModelStore((s) => s.addNode);
  const tool = useAnalysisStore((s) => s.viewportTool);
  const snapEnabled = useAnalysisStore((s) => s.snapEnabled);
  const snapResolution = useAnalysisStore((s) => s.snapResolution);
  const setTool = useAnalysisStore((s) => s.setViewportTool);
  const qc = useQueryClient();

  const size = useMemo(() => Math.max(modelBounds(model).size * 8, 20), [model]);

  const nextId = (model?.nodes.reduce((m, n) => Math.max(m, n.id), 0) ?? 0) + 1;

  const add = useMutation({
    mutationFn: (coords: { x: number; y: number; z: number }) =>
      modelsApi.addNode(model!.id, { id: nextId, ...coords }),
    onSuccess: (n) => {
      addNode(n);
      qc.invalidateQueries({ queryKey: ["model", model?.id] });
      toast("success", `Nodo #${n.id} creato in (${n.x.toFixed(2)}, ${n.y.toFixed(2)}, ${n.z.toFixed(2)})`);
    },
  });

  if (tool !== "create_node" || !model) return null;

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0, 0]}
      onClick={(ev) => {
        ev.stopPropagation();
        const p = ev.point;
        let x = p.x, y = p.y, z = p.z;
        if (snapEnabled && snapResolution > 0) {
          x = Math.round(x / snapResolution) * snapResolution;
          y = Math.round(y / snapResolution) * snapResolution;
          z = Math.round(z / snapResolution) * snapResolution;
        }
        add.mutate({ x, y, z });
        if (ev.nativeEvent && !(ev.nativeEvent as MouseEvent).shiftKey) {
          setTool("select");
        }
      }}
    >
      <planeGeometry args={[size, size]} />
      <meshBasicMaterial visible={false} side={THREE.DoubleSide} />
    </mesh>
  );
}
