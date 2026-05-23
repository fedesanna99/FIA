/**
 * NodeDetail (v1.5 Task 32).
 *
 * Vista contestuale del RightPanel "Inspect" mostrata quando l'utente ha
 * selezionato un nodo via click nel viewport. Sostituisce il modal NodeDialog.
 *
 * Sezioni: header (id + close), coordinate XYZ editabili, vincolo, carichi
 * applicati al nodo, elementi connessi. Footer con Annulla / Salva.
 *
 * Dati: derivati da `modelStore.model` (loads/constraints/elements filtrati
 * per node_id) — niente API GET dedicata al singolo nodo perche' il modello
 * intero e' gia' in store.
 */
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CircleDot, X, Plus, Trash2, Lock, ArrowRight } from "lucide-react";
import { modelsApi } from "../../../api/client";
import { useModelStore } from "../../../store/modelStore";
import { useSelectionStore } from "../../../store/selectionStore";
import { useUIStore } from "../../../store/uiStore";
import { toast } from "../../../store/toastStore";
import type { Node as FEANode, Load, Constraint, Element } from "../../../types/model";


export function NodeDetail({ nodeId }: { nodeId: number }) {
  const model = useModelStore((s) => s.model);
  const updateNode = useModelStore((s) => s.updateNode);
  const setOpenDialog = useUIStore((s) => s.setOpenDialog);
  const openEditLoad = useUIStore((s) => s.openEditLoad);
  const openEditConstraint = useUIStore((s) => s.openEditConstraint);
  const qc = useQueryClient();

  const node = useMemo<FEANode | null>(
    () => model?.nodes.find((n) => n.id === nodeId) ?? null,
    [model, nodeId],
  );

  // Coordinate editabili (sincronizzate al cambio nodo selezionato)
  const [coords, setCoords] = useState<[number, number, number]>(
    node ? [node.x, node.y, node.z] : [0, 0, 0],
  );
  useEffect(() => {
    if (node) setCoords([node.x, node.y, node.z]);
  }, [node]);

  const updateMut = useMutation({
    mutationFn: async (next: FEANode) => {
      if (!model) throw new Error("Nessun modello attivo");
      return modelsApi.updateNode(model.id, next.id, next);
    },
    onSuccess: (updated) => {
      // Aggiorna ottimisticamente lo store + invalida la cache.
      updateNode(updated.id, updated);
      qc.invalidateQueries({ queryKey: ["model", model?.id] });
      toast("success", `Nodo N${updated.id} aggiornato.`);
    },
    onError: (e) => toast("error", `Errore aggiornamento: ${(e as Error).message}`),
  });

  if (!model) {
    return <EmptyState text="Nessun modello attivo." />;
  }
  if (!node) {
    return <EmptyState text={`Nodo N${nodeId} non trovato.`} />;
  }

  const loads = model.loads.filter(
    (l) => (l.type === "nodal" || l.type === "nodal_mass" || l.type === "dynamic") && l.target_id === node.id,
  );
  const constraint = model.constraints.find((c) => c.node_id === node.id);
  const connectedElements = model.elements.filter((e) => e.nodes.includes(node.id));

  const dirty =
    Math.abs(coords[0] - node.x) > 1e-9 ||
    Math.abs(coords[1] - node.y) > 1e-9 ||
    Math.abs(coords[2] - node.z) > 1e-9;

  const handleSave = () => {
    updateMut.mutate({ ...node, x: coords[0], y: coords[1], z: coords[2] });
  };
  const handleClose = () => {
    useSelectionStore.getState().clear();
  };

  return (
    <div className="flex flex-col h-full" data-testid="node-detail">
      {/* Header */}
      <header className="px-4 py-3 border-b border-border flex items-center gap-2 flex-shrink-0">
        <CircleDot className="w-3.5 h-3.5 text-ink-info" />
        <span className="font-semibold text-sm text-ink">Nodo N{node.id}</span>
        {node.label && (
          <span className="text-[11px] text-ink-3 truncate">· {node.label}</span>
        )}
        <button
          type="button"
          onClick={handleClose}
          className="ml-auto text-ink-3 hover:text-ink transition-colors"
          aria-label="Chiudi inspect nodo"
          data-testid="node-detail-close"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </header>

      {/* Body */}
      <div className="flex-1 px-3.5 py-3 space-y-4 overflow-y-auto min-h-0">
        {/* Coordinate XYZ */}
        <section>
          <div className="text-[10px] uppercase tracking-wider text-ink-3 font-semibold mb-2">
            Coordinate
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {(["X", "Y", "Z"] as const).map((axis, i) => (
              <div key={axis}>
                <div className="text-[10px] text-ink-3 mb-0.5 font-mono">{axis}</div>
                <input
                  type="number"
                  step="0.01"
                  value={Number.isFinite(coords[i]) ? coords[i] : 0}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    setCoords((prev) => {
                      const next = [...prev] as [number, number, number];
                      next[i] = Number.isNaN(v) ? prev[i] : v;
                      return next;
                    });
                  }}
                  className="w-full bg-bg-panel border border-border rounded text-xs px-1.5 py-1 font-mono font-semibold text-ink focus:outline-none focus:border-accent/60 focus:bg-bg-elevated"
                  data-testid={`node-coord-${axis.toLowerCase()}`}
                />
              </div>
            ))}
          </div>
        </section>

        {/* Vincolo */}
        <section>
          <div className="text-[10px] uppercase tracking-wider text-ink-3 font-semibold mb-2">
            Vincolo
          </div>
          {constraint ? <ConstraintCard constraint={constraint} onEdit={() => openEditConstraint(constraint.id)} /> : (
            <button
              type="button"
              onClick={() => setOpenDialog("constraint")}
              className="w-full flex items-center gap-2 px-2.5 py-2 rounded border border-dashed border-border text-[11px] text-ink-3 hover:border-accent/40 hover:text-ink transition"
            >
              <Plus className="w-3 h-3" />
              Aggiungi vincolo
            </button>
          )}
        </section>

        {/* Carichi applicati */}
        <section>
          <div className="text-[10px] uppercase tracking-wider text-ink-3 font-semibold mb-2 flex justify-between">
            <span>Carichi applicati</span>
            <span className="font-mono">{loads.length}</span>
          </div>
          <div className="space-y-1.5 mb-2">
            {loads.map((l) => (
              <LoadCard key={l.id} load={l} onEdit={() => openEditLoad(l.id)} />
            ))}
          </div>
          <button
            type="button"
            onClick={() => setOpenDialog("load")}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded border border-dashed border-border text-[11px] text-ink-3 hover:border-accent/40 hover:text-ink transition"
          >
            <Plus className="w-3 h-3" />
            Aggiungi carico
          </button>
        </section>

        {/* Elementi connessi */}
        <section>
          <div className="text-[10px] uppercase tracking-wider text-ink-3 font-semibold mb-2 flex justify-between">
            <span>Connesso a</span>
            <span className="font-mono">{connectedElements.length}</span>
          </div>
          {connectedElements.length === 0 ? (
            <p className="text-[11px] text-ink-3 italic">Nessun elemento collegato.</p>
          ) : (
            <div className="space-y-0.5">
              {connectedElements.slice(0, 12).map((el) => (
                <ConnectedElementRow key={el.id} elem={el} nodeId={node.id} />
              ))}
              {connectedElements.length > 12 && (
                <p className="text-[10px] text-ink-3 mt-1">
                  +{connectedElements.length - 12} altri…
                </p>
              )}
            </div>
          )}
        </section>
      </div>

      {/* Footer */}
      <footer className="px-3.5 py-2.5 border-t border-border flex gap-2 flex-shrink-0">
        <button
          type="button"
          onClick={handleClose}
          className="flex-1 bg-bg-panel border border-border text-ink-3 hover:text-ink hover:bg-bg-hover text-[11px] py-1.5 rounded-md transition-colors"
          data-testid="node-detail-cancel"
        >
          Annulla
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!dirty || updateMut.isPending}
          className="flex-1 bg-accent hover:bg-accent-hover text-white text-[11px] font-semibold py-1.5 rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          data-testid="node-detail-save"
        >
          {updateMut.isPending ? "Salvataggio…" : "Salva"}
        </button>
      </footer>
    </div>
  );
}


// ── Helpers ────────────────────────────────────────────────────────────────

function EmptyState({ text }: { text: string }) {
  return (
    <div className="p-4 text-[11px] text-ink-3 italic">{text}</div>
  );
}


function ConstraintCard({ constraint, onEdit }: { constraint: Constraint; onEdit: () => void }) {
  const dofLabel = constraint.dofs
    ? constraint.dofs.map((d, i) => d ? ["UX","UY","UZ","RX","RY","RZ"][i] : "").filter(Boolean).join("·")
    : constraint.type;
  return (
    <button
      type="button"
      onClick={onEdit}
      className="w-full text-left bg-bg-panel border border-border hover:border-accent/30 rounded-md px-2.5 py-2 transition"
    >
      <div className="flex items-center gap-2">
        <Lock className="w-3 h-3 text-ink-warn" />
        <span className="text-[11px] font-semibold text-ink capitalize">{constraint.type}</span>
        <Trash2 className="w-3 h-3 text-ink-3 ml-auto" />
      </div>
      <div className="text-[10px] text-ink-3 font-mono mt-0.5">{dofLabel || "—"}</div>
    </button>
  );
}


function LoadCard({ load, onEdit }: { load: Load; onEdit: () => void }) {
  const desc =
    load.type === "nodal"
      ? formatNodalLoad(load)
      : load.type === "nodal_mass"
      ? `mass ${load.mass ?? 0} kg`
      : load.type;
  return (
    <button
      type="button"
      onClick={onEdit}
      className="w-full text-left bg-bg-panel border border-border hover:border-accent/30 rounded-md px-2.5 py-1.5 transition flex items-center gap-2"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-coral flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-medium text-ink capitalize truncate">
          {load.label ?? load.type}
        </div>
        <div className="text-[10px] text-ink-3 font-mono truncate">{desc}</div>
      </div>
    </button>
  );
}


function formatNodalLoad(l: Load): string {
  const parts: string[] = [];
  if (l.fx) parts.push(`Fx=${l.fx}`);
  if (l.fy) parts.push(`Fy=${l.fy}`);
  if (l.fz) parts.push(`Fz=${l.fz}`);
  if (l.mx) parts.push(`Mx=${l.mx}`);
  if (l.my) parts.push(`My=${l.my}`);
  if (l.mz) parts.push(`Mz=${l.mz}`);
  return parts.join(" · ") || "—";
}


function ConnectedElementRow({ elem, nodeId }: { elem: Element; nodeId: number }) {
  const otherIds = elem.nodes.filter((id) => id !== nodeId);
  const dir = otherIds.length > 0 ? `→ N${otherIds.join(", N")}` : "";
  return (
    <button
      type="button"
      onClick={() => useSelectionStore.getState().selectElement(elem.id)}
      className="w-full flex items-center justify-between gap-2 px-1.5 py-1 hover:bg-bg-hover rounded-sm text-left transition"
    >
      <span className="text-[11px] text-ink-3 font-mono truncate">
        E{elem.id} · {elem.type}
      </span>
      <span className="text-[10px] text-ink-3 flex items-center gap-1 flex-shrink-0">
        {dir} <ArrowRight className="w-2.5 h-2.5" />
      </span>
    </button>
  );
}
