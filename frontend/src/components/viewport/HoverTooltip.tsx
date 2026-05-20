import { useEffect, useState } from "react";
import { useModelStore } from "../../store/modelStore";
import { useResultsStore } from "../../store/resultsStore";
import { fmtLength, fmtStress, fmtForce } from "../../utils/units";

export function HoverTooltip() {
  const hover = useModelStore((s) => s.hover);
  const model = useModelStore((s) => s.model);
  const staticRes = useResultsStore((s) => s.staticResults);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const onMove = (e: MouseEvent) => setPos({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  if (!hover || !model) return null;

  return (
    <div
      className="fixed pointer-events-none z-40 bg-bg-panel/95 border border-border rounded px-2 py-1.5 text-[11px] numeric shadow-lg backdrop-blur"
      style={{ left: pos.x + 16, top: pos.y + 12, minWidth: 160 }}
    >
      {hover.kind === "node" && <NodeTooltip nodeId={hover.id} x={hover.x} y={hover.y} z={hover.z} />}
      {hover.kind === "element" && <ElementTooltip elementId={hover.id} elementType={hover.type} nodes={hover.nodes} />}
    </div>
  );

  function NodeTooltip({ nodeId, x, y, z }: { nodeId: number; x: number; y: number; z: number }) {
    const disp = staticRes?.displacements.find((d) => d.node_id === nodeId);
    const reac = staticRes?.reactions.find((r) => r.node_id === nodeId);
    return (
      <div>
        <div className="text-accent-primary font-semibold mb-0.5">Nodo #{nodeId}</div>
        <div className="text-ink-dim">
          ({fmtLength(x)}, {fmtLength(y)}, {fmtLength(z)})
        </div>
        {disp && (
          <div className="text-ink mt-1 pt-1 border-t border-border">
            u: ({(disp.ux * 1000).toFixed(2)}, {(disp.uy * 1000).toFixed(2)}, {(disp.uz * 1000).toFixed(2)}) mm
          </div>
        )}
        {reac && (reac.fx !== 0 || reac.fy !== 0 || reac.fz !== 0) && (
          <div className="text-accent-success">
            R: ({fmtForce(reac.fx)}, {fmtForce(reac.fy)}, {fmtForce(reac.fz)})
          </div>
        )}
      </div>
    );
  }

  function ElementTooltip({ elementId, elementType, nodes }: {
    elementId: number; elementType: string; nodes: number[];
  }) {
    const el = model?.elements.find((e) => e.id === elementId);
    const stress = staticRes?.element_stresses.find((s) => s.element_id === elementId);
    const forces = staticRes?.element_forces.find((f) => f.element_id === elementId);
    return (
      <div>
        <div className="text-accent-primary font-semibold mb-0.5">Elem #{elementId}</div>
        <div className="text-ink-dim">{elementType} · [{nodes.join(", ")}]</div>
        {el?.material_id && <div className="text-ink-dim">mat: {el.material_id}</div>}
        {el?.section_id && <div className="text-ink-dim">sez: {el.section_id}</div>}
        {forces && (
          <div className="text-ink mt-1 pt-1 border-t border-border">
            N = {fmtForce(forces.N_i)}{forces.Mz_i !== 0 && `, M = ${(forces.Mz_i / 1000).toFixed(2)} kNm`}
          </div>
        )}
        {stress && stress.von_mises > 0 && (
          <div className="text-accent-warning">σVM = {fmtStress(stress.von_mises)}</div>
        )}
      </div>
    );
  }
}
