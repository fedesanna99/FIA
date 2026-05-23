/**
 * IsosurfacePanel — iso-superfici 3D su mesh solida (BL-7).
 *
 * Calcola iso-superfici via marching tetrahedra (T4/T10) o decomposizione
 * 5-tet per esaedri (H8). Visualizza la mesh di triangoli per ogni livello
 * con area totale (utile per zone plastiche, superfici di rottura, ecc.).
 *
 * Il campo scalare default è σ_VM da staticResults.element_stresses
 * smoothato sui nodi (media tra elementi adiacenti).
 */
import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Globe } from "lucide-react";
import { useModelStore } from "../../store/modelStore";
import { useResultsStore } from "../../store/resultsStore";
import { postprocessApi, type IsosurfaceResponse } from "../../api/postprocess";
import { toast } from "../../store/toastStore";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Field, NumericInput } from "../ui/Input";
import { Badge } from "../ui/Badge";
import { EmptyState } from "../ui/EmptyState";

export function IsosurfacePanel() {
  const model = useModelStore((s) => s.model);
  const { staticResults } = useResultsStore();
  const [nAutoLevels, setNAutoLevels] = useState(5);
  const [explicitLevels, setExplicitLevels] = useState<string>("");  // "0.1, 0.5, 1.0"
  const [result, setResult] = useState<IsosurfaceResponse | null>(null);

  /**
   * Campo nodale ottenuto smoothando σ_VM per elemento sui nodi adiacenti.
   * Se manca σ_VM, fallback a Σ|N|/n_adj.
   */
  const nodalField = useMemo(() => {
    if (!model || !staticResults) return null;

    // Mappa node_id → list di valori di elementi che lo contengono
    const adj: Record<number, number[]> = {};
    for (const n of model.nodes) adj[n.id] = [];

    // Prima fonte: element_stresses (σ_VM da statica)
    const stresses = (staticResults as any).element_stresses;
    const elemValues: Record<number, number> = {};
    if (Array.isArray(stresses) && stresses.length > 0) {
      for (const s of stresses) {
        if (s.element_id != null) {
          elemValues[s.element_id] = s.sigma_vm ?? s.von_mises ?? 0;
        }
      }
    }
    // Fallback: |N| da element_forces
    if (Object.keys(elemValues).length === 0) {
      for (const f of staticResults.element_forces) {
        elemValues[f.element_id] = Math.abs(f.N_i ?? 0);
      }
    }
    if (Object.keys(elemValues).length === 0) return null;

    // Per ogni elemento, propaga il valore ai suoi nodi
    for (const el of model.elements) {
      const v = elemValues[el.id];
      if (v == null) continue;
      for (const nid of el.nodes) {
        if (adj[nid] !== undefined) adj[nid].push(v);
      }
    }
    // Media nodale
    const field: Record<number, number> = {};
    for (const [nidStr, vals] of Object.entries(adj)) {
      if (vals.length === 0) continue;
      const nid = Number(nidStr);
      field[nid] = vals.reduce((a, b) => a + b, 0) / vals.length;
    }
    return Object.keys(field).length > 0 ? field : null;
  }, [model, staticResults]);

  const parsedExplicitLevels = useMemo(() => {
    const trimmed = explicitLevels.trim();
    if (!trimmed) return null;
    const parts = trimmed
      .split(/[,;\s]+/)
      .map((p) => Number(p))
      .filter((x) => !Number.isNaN(x) && Number.isFinite(x));
    return parts.length > 0 ? parts : null;
  }, [explicitLevels]);

  const hasSolids = useMemo(() => {
    if (!model) return false;
    return model.elements.some((e) =>
      e.type === "solid_t4" || e.type === "solid_t10" || e.type === "solid_h8",
    );
  }, [model]);

  const setIsosurfaceData = useResultsStore((s) => s.setIsosurfaceData);
  const showIsosurfaces = useResultsStore((s) => s.showIsosurfaces);
  const toggleIsosurfaces = useResultsStore((s) => s.toggleIsosurfaces);

  const mut = useMutation({
    mutationFn: () => {
      if (!model) throw new Error("Nessun modello attivo");
      if (!nodalField) throw new Error("Nessun campo scalare disponibile (esegui statica su mesh solida)");
      return postprocessApi.isosurfaces(model.id, {
        field: nodalField,
        levels: parsedExplicitLevels ?? undefined,
        n_auto_levels: nAutoLevels,
      });
    },
    onSuccess: (r) => {
      setResult(r);
      setIsosurfaceData(r);  // mostra automaticamente nel viewport
      toast("success",
        `Iso-surfaces: ${r.levels.length} livelli, ${r.n_tets} tet + ${r.n_hexes} hex elaborati`);
    },
    onError: (e) => toast("error", `Errore iso-surfaces: ${(e as Error).message}`),
  });

  if (!staticResults) {
    return (
      <div className="p-3">
        <EmptyState
          title="Nessun risultato statico"
          description="Esegui un'analisi statica per ottenere il campo di tensione su cui costruire le iso-superfici 3D."
        />
      </div>
    );
  }

  if (!hasSolids) {
    return (
      <div className="p-3">
        <EmptyState
          title="Modello senza elementi solidi"
          description="Le iso-superfici 3D richiedono elementi SOLID_T4, SOLID_T10 o SOLID_H8 nel modello."
        />
      </div>
    );
  }

  return (
    <div className="p-3 space-y-3">
      <Card
        title="Iso-superfici 3D (marching tetrahedra)"
        description="Estrae superfici di livello costante (σ_VM) da mesh solide. T10 usa solo i 4 vertici; H8 viene decomposto in 5 tet."
      >
        <div className="space-y-2 mb-3">
          <Field label="N° livelli automatici" hint="Quantili tra min e max">
            <NumericInput value={nAutoLevels} onChange={setNAutoLevels} step={1} min={1} max={20} />
          </Field>
          <Field label="Livelli espliciti (opz.)" hint="Es. '0.1, 0.5, 1.0' — override degli automatici">
            <input
              type="text"
              className="input"
              placeholder="vuoto = automatici"
              value={explicitLevels}
              onChange={(e) => setExplicitLevels(e.target.value)}
            />
          </Field>
          <div className="text-[10px] text-ink-3">
            Campo nodale (smoothing media adiacenti):{" "}
            <span className="font-mono">
              {nodalField ? `${Object.keys(nodalField).length} nodi` : "non disponibile"}
            </span>
          </div>
        </div>
        <Button
          variant="primary" size="sm"
          iconLeft={<Globe className="h-3.5 w-3.5" />}
          disabled={!model || !nodalField || mut.isPending}
          loading={mut.isPending}
          onClick={() => mut.mutate()}
        >
          {mut.isPending ? "Estrazione…" : "Estrai iso-superfici"}
        </Button>
      </Card>

      {result && (
        <>
          <Card title="Riepilogo livelli">
            <div className="grid grid-cols-3 gap-2 text-xs">
              <Stat label="Livelli" value={String(result.levels.length)} />
              <Stat label="Tet elab." value={String(result.n_tets)} />
              <Stat label="Hex elab." value={String(result.n_hexes)} />
            </div>
            <label className="mt-3 flex items-center gap-2 cursor-pointer text-xs">
              <input
                type="checkbox"
                checked={showIsosurfaces}
                onChange={toggleIsosurfaces}
              />
              <span>Mostra iso-superfici nel viewport 3D</span>
            </label>
          </Card>

          <Card
            title="Aree per livello"
            description="Area totale della superficie estratta per ogni iso-valore."
          >
            <div className="space-y-0.5 max-h-56 overflow-auto">
              {result.levels.map((lvl) => {
                const k = String(lvl);
                const area = result.area_per_level[k] ?? 0;
                const nTri = result.triangles_per_level[k]?.length ?? 0;
                return (
                  <div
                    key={k}
                    className="flex items-center justify-between text-[11px] gap-2 font-mono"
                  >
                    <span className="text-ink-3 w-20">
                      σ = {Number(lvl).toExponential(2)}
                    </span>
                    <Badge size="sm" variant={area > 0 ? "info" : "default"}>
                      {nTri} tri
                    </Badge>
                    <span className="text-accent">
                      A = {area.toExponential(3)} m²
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
        </>
      )}

      {!result && !mut.isPending && (
        <EmptyState
          title="Nessuna iso-superficie estratta"
          description="Configura il numero di livelli e premi 'Estrai iso-superfici'."
        />
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-bg/40 border border-border rounded px-2 py-1.5">
      <div className="font-mono text-[9px] uppercase tracking-wide-2 font-semibold text-ink-3">{label}</div>
      <div className="text-sm font-mono text-ink">{value}</div>
    </div>
  );
}
