import { useModelStore } from "../../store/modelStore";
import { useResultsStore } from "../../store/resultsStore";
import { fmtLength, fmtForce, fmtStress } from "../../utils/units";

export function SelectionInspector() {
  const model = useModelStore((s) => s.model);
  const { selectedNodeIds, selectedElementIds } = useModelStore();
  const { staticResults } = useResultsStore();

  if (!model) return null;

  const selNodes = model.nodes.filter((n) => selectedNodeIds.has(n.id));
  const selElements = model.elements.filter((e) => selectedElementIds.has(e.id));

  if (selNodes.length === 0 && selElements.length === 0) {
    return (
      <div className="p-4 text-xs text-ink-dim leading-relaxed">
        <div className="font-semibold text-ink mb-2">Nessuna selezione</div>
        Clicca su un nodo o un elemento nel viewport (o nell'albero modello) per ispezionare le proprietà.
        <div className="mt-3 text-[10px] text-ink-dim leading-relaxed">
          <div>· Shift + click → aggiunge alla selezione</div>
          <div>· Click viewport → ruota / pan / zoom</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 text-xs space-y-3">
      {selNodes.map((n) => {
        const disp = staticResults?.displacements.find((d) => d.node_id === n.id);
        const react = staticResults?.reactions.find((r) => r.node_id === n.id);
        return (
          <div key={`n-${n.id}`} className="panel rounded">
            <div className="panel-header flex items-center justify-between">
              <span>Nodo #{n.id}</span>
              {n.label && <span className="text-ink-dim normal-case">{n.label}</span>}
            </div>
            <div className="p-2 space-y-1">
              <Row k="x" v={fmtLength(n.x)} />
              <Row k="y" v={fmtLength(n.y)} />
              <Row k="z" v={fmtLength(n.z)} />
              {disp && (
                <>
                  <div className="border-t border-border mt-2 pt-2 text-accent-primary text-[10px] uppercase">Spostamenti</div>
                  <Row k="uₓ" v={fmtLength(disp.ux)} />
                  <Row k="uᵧ" v={fmtLength(disp.uy)} />
                  <Row k="u_z" v={fmtLength(disp.uz)} />
                  <Row k="θₓ" v={`${(disp.rx * 1000).toFixed(3)} mrad`} />
                  <Row k="θᵧ" v={`${(disp.ry * 1000).toFixed(3)} mrad`} />
                  <Row k="θ_z" v={`${(disp.rz * 1000).toFixed(3)} mrad`} />
                </>
              )}
              {react && (
                <>
                  <div className="border-t border-border mt-2 pt-2 text-accent-success text-[10px] uppercase">Reazioni</div>
                  <Row k="Fₓ" v={fmtForce(react.fx)} />
                  <Row k="Fᵧ" v={fmtForce(react.fy)} />
                  <Row k="F_z" v={fmtForce(react.fz)} />
                </>
              )}
            </div>
          </div>
        );
      })}

      {selElements.map((e) => {
        const forces = staticResults?.element_forces.find((f) => f.element_id === e.id);
        const stress = staticResults?.element_stresses.find((s) => s.element_id === e.id);
        return (
          <div key={`e-${e.id}`} className="panel rounded">
            <div className="panel-header flex items-center justify-between">
              <span>Elem #{e.id}</span>
              <span className="text-ink-dim normal-case">{e.type}</span>
            </div>
            <div className="p-2 space-y-1">
              <Row k="nodi" v={`[${e.nodes.join(", ")}]`} />
              <Row k="materiale" v={e.material_id} />
              {e.section_id && <Row k="sezione" v={e.section_id} />}
              {forces && (
                <>
                  <div className="border-t border-border mt-2 pt-2 text-accent-primary text-[10px] uppercase">Forze interne (estremo i)</div>
                  <Row k="N" v={fmtForce(forces.N_i)} />
                  <Row k="Vy" v={fmtForce(forces.Vy_i)} />
                  <Row k="Mz" v={`${(forces.Mz_i / 1000).toFixed(3)} kNm`} />
                </>
              )}
              {stress && (
                <>
                  <div className="border-t border-border mt-2 pt-2 text-accent-warning text-[10px] uppercase">Tensione</div>
                  <Row k="σ Von Mises" v={fmtStress(stress.von_mises)} />
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-ink-muted">{k}</span>
      <span className="numeric text-ink">{v}</span>
    </div>
  );
}
