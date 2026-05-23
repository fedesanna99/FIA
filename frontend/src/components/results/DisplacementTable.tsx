import { useResultsStore } from "../../store/resultsStore";

export function DisplacementTable() {
  const res = useResultsStore((s) => s.staticResults)!;
  return (
    <div className="numeric text-[11px]">
      <div className="grid grid-cols-4 gap-1 text-ink-3 uppercase text-[10px] border-b border-border pb-1 mb-1">
        <span>Nodo</span><span>uₓ [mm]</span><span>uᵧ [mm]</span><span>u_z [mm]</span>
      </div>
      <div className="max-h-[60vh] overflow-auto">
        {res.displacements.map((d) => (
          <div key={d.node_id} className="grid grid-cols-4 gap-1 py-0.5 hover:bg-bg-hover">
            <span className="text-accent-primary">#{d.node_id}</span>
            <span>{(d.ux * 1000).toFixed(3)}</span>
            <span>{(d.uy * 1000).toFixed(3)}</span>
            <span>{(d.uz * 1000).toFixed(3)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
