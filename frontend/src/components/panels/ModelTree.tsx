import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useModelStore } from "../../store/modelStore";
import { useUIStore } from "../../store/uiStore";
import { modelsApi } from "../../api/client";
import { toast } from "../../store/toastStore";

type Branch = "nodes" | "elements" | "loads" | "constraints" | null;

export function ModelTree() {
  const model = useModelStore((s) => s.model);
  const {
    selectNode, selectElement,
    selectedNodeIds, selectedElementIds,
    removeNode, removeElement, removeLoad, removeConstraint,
  } = useModelStore();
  const openEditNode = useUIStore((s) => s.openEditNode);
  const openEditElement = useUIStore((s) => s.openEditElement);
  const openEditLoad = useUIStore((s) => s.openEditLoad);
  const openEditConstraint = useUIStore((s) => s.openEditConstraint);
  const [open, setOpen] = useState<Branch>("nodes");
  const [filter, setFilter] = useState("");
  const qc = useQueryClient();

  const f = filter.trim().toLowerCase();
  const matchNode = (n: any) => !f || `${n.id}`.includes(f) || (n.label && n.label.toLowerCase().includes(f));
  const matchElement = (e: any) => !f || `${e.id}`.includes(f) || e.type.includes(f) || e.material_id.includes(f);
  const matchLoad = (l: any) => !f || `${l.id}`.includes(f) || l.type.includes(f) || `${l.target_id}`.includes(f);
  const matchConstr = (c: any) => !f || `${c.id}`.includes(f) || c.type.includes(f) || `${c.node_id}`.includes(f);

  const delNode = useMutation({
    mutationFn: (id: number) => modelsApi.deleteNode(model!.id, id),
    onSuccess: (_, id) => {
      removeNode(id);
      qc.invalidateQueries({ queryKey: ["model", model?.id] });
      toast("info", `Nodo #${id} eliminato`);
    },
  });
  const delElem = useMutation({
    mutationFn: (id: number) => modelsApi.deleteElement(model!.id, id),
    onSuccess: (_, id) => {
      removeElement(id);
      qc.invalidateQueries({ queryKey: ["model", model?.id] });
      toast("info", `Elemento #${id} eliminato`);
    },
  });
  const delLoad = useMutation({
    mutationFn: (id: number) => modelsApi.deleteLoad(model!.id, id),
    onSuccess: (_, id) => {
      removeLoad(id);
      qc.invalidateQueries({ queryKey: ["model", model?.id] });
      toast("info", `Carico #${id} eliminato`);
    },
  });
  const delConstr = useMutation({
    mutationFn: (id: number) => modelsApi.deleteConstraint(model!.id, id),
    onSuccess: (_, id) => {
      removeConstraint(id);
      qc.invalidateQueries({ queryKey: ["model", model?.id] });
      toast("info", `Vincolo #${id} eliminato`);
    },
  });

  if (!model) {
    return (
      <div className="p-4 text-xs text-ink-dim">
        Seleziona un modello dalla toolbar per iniziare.
      </div>
    );
  }

  const Section = ({ id, title, count, children }: {
    id: Branch; title: string; count: number; children?: React.ReactNode;
  }) => (
    <div>
      <button
        className="w-full flex items-center justify-between px-3 py-1.5 text-xs uppercase tracking-wider hover:bg-bg-hover text-ink-muted"
        onClick={() => setOpen(open === id ? null : id)}
      >
        <span className="flex items-center gap-2">
          <span className="text-accent-primary">{open === id ? "▾" : "▸"}</span>
          {title}
        </span>
        <span className="numeric text-accent-primary">{count}</span>
      </button>
      {open === id && <div className="bg-bg/40">{children}</div>}
    </div>
  );

  const TreeRow = ({ selected, onClick, onDoubleClick, onDelete, children }: {
    selected: boolean; onClick: (e: React.MouseEvent) => void;
    onDoubleClick?: () => void;
    onDelete: () => void; children: React.ReactNode;
  }) => (
    <div className={`group px-6 py-1 flex items-center justify-between cursor-pointer numeric ${
      selected ? "bg-accent-primary/15 text-accent-primary" : "hover:bg-bg-hover"
    }`} onClick={onClick} onDoubleClick={onDoubleClick}>
      <div className="flex-1 truncate">{children}</div>
      <button
        className="opacity-0 group-hover:opacity-100 text-accent-danger hover:bg-accent-danger/20 px-1.5 rounded transition"
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        title="Elimina"
      >×</button>
    </div>
  );

  return (
    <div className="text-xs">
      <div className="px-3 py-2 border-b border-border">
        <div className="font-semibold text-ink">{model.name}</div>
        {model.description && (
          <div className="text-ink-dim text-[10px] mt-0.5 leading-snug">{model.description}</div>
        )}
      </div>
      <div className="px-3 py-1.5 border-b border-border">
        <input
          className="input text-[11px]"
          placeholder="🔎 filtra per id, tipo o materiale..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>
      <Section id="nodes" title="Nodi" count={model.nodes.filter(matchNode).length}>
        {model.nodes.filter(matchNode).map((n) => (
          <TreeRow
            key={n.id}
            selected={selectedNodeIds.has(n.id)}
            onClick={(e) => selectNode(n.id, e.shiftKey)}
            onDoubleClick={() => openEditNode(n.id)}
            onDelete={() => delNode.mutate(n.id)}
          >
            <span>#{n.id}</span>{" "}
            <span className="text-ink-dim">
              ({n.x.toFixed(1)}, {n.y.toFixed(1)}, {n.z.toFixed(1)})
            </span>
          </TreeRow>
        ))}
      </Section>
      <Section id="elements" title="Elementi" count={model.elements.filter(matchElement).length}>
        {model.elements.filter(matchElement).map((e) => (
          <TreeRow
            key={e.id}
            selected={selectedElementIds.has(e.id)}
            onClick={(ev) => selectElement(e.id, ev.shiftKey)}
            onDoubleClick={() => openEditElement(e.id)}
            onDelete={() => delElem.mutate(e.id)}
          >
            <span>#{e.id}</span>{" "}
            <span className="text-ink-dim">{e.type} · [{e.nodes.join(",")}]</span>
          </TreeRow>
        ))}
      </Section>
      <Section id="loads" title="Carichi" count={model.loads.filter(matchLoad).length}>
        {model.loads.filter(matchLoad).map((l) => (
          <TreeRow
            key={l.id}
            selected={false}
            onClick={() => { /* nessuna selezione carichi */ }}
            onDoubleClick={() => openEditLoad(l.id)}
            onDelete={() => delLoad.mutate(l.id)}
          >
            <span className="text-accent-warning">#{l.id}</span>{" "}
            <span className="text-ink-dim">{l.type} → {l.target_id || "global"}</span>
          </TreeRow>
        ))}
      </Section>
      <Section id="constraints" title="Vincoli" count={model.constraints.filter(matchConstr).length}>
        {model.constraints.filter(matchConstr).map((c) => (
          <TreeRow
            key={c.id}
            selected={false}
            onClick={() => { /* nessuna selezione vincoli */ }}
            onDoubleClick={() => openEditConstraint(c.id)}
            onDelete={() => delConstr.mutate(c.id)}
          >
            <span className="text-accent-success">#{c.id}</span>{" "}
            <span className="text-ink-dim">{c.type} @ {c.node_id}</span>
          </TreeRow>
        ))}
      </Section>
    </div>
  );
}
