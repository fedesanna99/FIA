import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog } from "./Dialog";
import { modelsApi, materialsApi } from "../../api/client";
import { useModelStore } from "../../store/modelStore";
import { toast } from "../../store/toastStore";
import type { ElementType } from "../../types/model";
import { TipBubble } from "../ui/TipBubble";
import { SectionPicker } from "../pickers/SectionPicker";
import { MaterialPicker } from "../pickers/MaterialPicker";

const ELEMENT_OPTIONS: { value: ElementType; label: string; nodeCount: number }[] = [
  { value: "beam2d",        label: "Beam 2D",                  nodeCount: 2 },
  { value: "beam3d",        label: "Beam 3D",                  nodeCount: 2 },
  { value: "truss2d",       label: "Truss 2D",                 nodeCount: 2 },
  { value: "truss3d",       label: "Truss 3D",                 nodeCount: 2 },
  { value: "cable2d",       label: "Cable 2D (tension-only)",  nodeCount: 2 },
  { value: "cable3d",       label: "Cable 3D (tension-only)",  nodeCount: 2 },
  { value: "tri3",          label: "Tri T3 (plane-stress)",    nodeCount: 3 },
  { value: "shell_q4",      label: "Shell Q4",                 nodeCount: 4 },
  { value: "shell_q4_mitc", label: "Shell Q4 MITC4 (anti-locking)", nodeCount: 4 },
  { value: "solid_h8",      label: "Solid H8",                 nodeCount: 8 },
  { value: "solid_t4",      label: "Solid Tet4",               nodeCount: 4 },
  { value: "solid_t10",     label: "Solid Tet10 (quadratic)",  nodeCount: 10 },
];

interface Props {
  open: boolean;
  onClose: () => void;
  /** Se valorizzato, il dialog modifica un elemento esistente. */
  editElementId?: number | null;
}

export function ElementDialog({ open, onClose, editElementId = null }: Props) {
  const model = useModelStore((s) => s.model);
  const addElement = useModelStore((s) => s.addElement);
  const selectedNodes = useModelStore((s) => s.selectedNodeIds);
  const editing = editElementId != null
    ? model?.elements.find((e) => e.id === editElementId)
    : null;

  const nextId = (model?.elements.reduce((m, e) => Math.max(m, e.id), 0) ?? 0) + 1;
  const [id, setId] = useState<number>(editing?.id ?? nextId);
  const [type, setType] = useState<ElementType>(editing?.type ?? "beam2d");
  const [materialId, setMaterialId] = useState(editing?.material_id ?? "steel_s355");
  const [sectionId, setSectionId] = useState(editing?.section_id ?? "ipe_300");
  const [nodesText, setNodesText] = useState(
    editing ? editing.nodes.join(",") : Array.from(selectedNodes).join(","),
  );
  const [releasesText, setReleasesText] = useState(
    editing?.releases ? editing.releases.join(",") : "",
  );
  const [winklerK, setWinklerK] = useState<string>(
    editing?.winkler_k != null ? String(editing.winkler_k) : "",
  );
  const [pretension, setPretension] = useState<string>(
    editing?.pretension != null ? String(editing.pretension) : "",
  );
  const qc = useQueryClient();

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setId(editing.id);
      setType(editing.type);
      setMaterialId(editing.material_id);
      setSectionId(editing.section_id ?? "ipe_300");
      setNodesText(editing.nodes.join(","));
      setReleasesText(editing.releases ? editing.releases.join(",") : "");
      setWinklerK(editing.winkler_k != null ? String(editing.winkler_k) : "");
      setPretension(editing.pretension != null ? String(editing.pretension) : "");
    } else {
      setId(nextId);
      setType("beam2d");
      setMaterialId("steel_s355");
      setSectionId("ipe_300");
      setNodesText(Array.from(selectedNodes).join(","));
      setReleasesText("");
      setWinklerK("");
      setPretension("");
    }
  }, [open, editing, nextId, selectedNodes]);

  const { data: materials } = useQuery({ queryKey: ["materials"], queryFn: () => materialsApi.list(), staleTime: Infinity });
  const { data: sections } = useQuery({ queryKey: ["sections"], queryFn: () => materialsApi.listSections(), staleTime: Infinity });

  // v1.6 S0 · B13: picker dialog state (sostituiscono i <select> hard-coded).
  const [matPickerOpen, setMatPickerOpen] = useState(false);
  const [secPickerOpen, setSecPickerOpen] = useState(false);
  const selectedMaterial = materials?.find((m) => m.id === materialId);
  const selectedSection = sections?.find((s) => s.id === sectionId);

  const expected = ELEMENT_OPTIONS.find((o) => o.value === type)?.nodeCount ?? 2;

  const mutation = useMutation({
    mutationFn: () => {
      if (!model) throw new Error("Nessun modello");
      const nodeIds = nodesText.split(",").map((s) => Number(s.trim())).filter(Boolean);
      if (nodeIds.length !== expected) {
        throw new Error(`L'elemento ${type} richiede ${expected} nodi (${nodeIds.length} forniti)`);
      }
      const releases = releasesText.trim()
        ? releasesText.split(",").map((s) => Number(s.trim())).filter((n) => Number.isFinite(n))
        : undefined;
      const wk = winklerK.trim() ? Number(winklerK) : undefined;
      const pt = pretension.trim() ? Number(pretension) : undefined;
      const isCable = type === "cable2d" || type === "cable3d";
      const payload: any = {
        id, type, nodes: nodeIds,
        material_id: materialId,
        section_id: sectionId,
        releases,
        // winkler_k è supportato solo su beam2d (vedi FASE 8)
        ...(type === "beam2d" && wk != null && Number.isFinite(wk) ? { winkler_k: wk } : {}),
        // pretension è supportata solo sui cavi (vedi BL-1)
        ...(isCable && pt != null && Number.isFinite(pt) ? { pretension: pt } : {}),
      };
      if (editing) return modelsApi.updateElement(model.id, editing.id, payload);
      return modelsApi.addElement(model.id, payload);
    },
    onSuccess: (el) => {
      addElement(el);
      qc.invalidateQueries({ queryKey: ["model", model?.id] });
      toast("success", editing ? `Elemento #${el.id} aggiornato` : `Elemento #${el.id} aggiunto`);
      onClose();
    },
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={editing ? `Modifica elemento #${editing.id}` : "Aggiungi elemento"}
      width={500}
      footer={
        <>
          <button className="btn" onClick={onClose}>Annulla</button>
          <button className="btn btn-primary" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? "..." : (editing ? "Salva" : "Aggiungi")}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        {mutation.isError && (
          <div className="text-accent-danger text-xs">{(mutation.error as Error).message}</div>
        )}
        {/* v1.7 T4: stack su mobile (no overflow del select Tipo con
            label lunghe come "Shell Q4 MITC4 (anti-locking)"). 2 colonne
            da sm: 640px in su. */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label block mb-1">ID</label>
            <input type="number" className="input w-full" value={id}
                   onChange={(e) => setId(Number(e.target.value))} disabled={!!editing} />
          </div>
          <div>
            <label className="label block mb-1">Tipo</label>
            <select className="input w-full" value={type} onChange={(e) => setType(e.target.value as ElementType)}
                    disabled={!!editing}>
              {ELEMENT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="label block mb-1">Nodi (CSV — {expected} richiesti)</label>
          <input className="input" placeholder="es. 1,2"
                 value={nodesText} onChange={(e) => setNodesText(e.target.value)} />
          {!editing && selectedNodes.size > 0 && (
            <button
              className="text-[10px] text-accent-primary mt-1 hover:underline"
              onClick={() => setNodesText(Array.from(selectedNodes).join(","))}
            >
              Usa selezione corrente ({selectedNodes.size} nodi)
            </button>
          )}
        </div>
        {/* v1.6 S0 · B13: i dropdown <select> diventano bottoni "Cambia..." */}
        {/* che aprono SectionPicker/MaterialPicker — modal 2-colonne con */}
        {/* search + famiglie + meta. Lista completa libreria backend. */}
        <div>
          <label className="label block mb-1">Materiale</label>
          <button
            type="button"
            onClick={() => setMatPickerOpen(true)}
            data-testid="element-material-pick"
            className="w-full input text-left flex items-center justify-between hover:border-accent transition-colors"
          >
            <span className="truncate">
              {selectedMaterial?.name ?? <span className="text-ink-muted">Scegli materiale...</span>}
            </span>
            <span className="text-[10px] text-ink-muted ml-2 flex-shrink-0">cambia</span>
          </button>
        </div>
        <div>
          <label className="label block mb-1">Sezione</label>
          <button
            type="button"
            onClick={() => setSecPickerOpen(true)}
            data-testid="element-section-pick"
            className="w-full input text-left flex items-center justify-between hover:border-accent transition-colors"
          >
            <span className="truncate">
              {selectedSection?.name ?? <span className="text-ink-muted">Scegli sezione...</span>}
            </span>
            <span className="text-[10px] text-ink-muted ml-2 flex-shrink-0">cambia</span>
          </button>
        </div>
        {(type === "beam2d" || type === "beam3d") && (
          <div>
            <label className="label block mb-1">Releases (cerniere interne, opzionale)</label>
            <input className="input numeric" placeholder="es. 5 oppure 2,5"
                   value={releasesText} onChange={(e) => setReleasesText(e.target.value)} />
            <div className="text-[10px] text-ink-dim mt-1">
              Indici dof locali da rilasciare. Beam2D: 2=θ_i, 5=θ_j. Beam3D: 3-5=θ_i, 9-11=θ_j.
            </div>
          </div>
        )}
        {type === "beam2d" && (
          <div>
            <label className="label block mb-1 flex items-center gap-1.5">
              Suolo di Winkler k [N/m²] (opzionale)
              <TipBubble tipId="winkler-k" />
            </label>
            <input className="input numeric" placeholder="es. 5e7 per terreno medio"
                   value={winklerK} onChange={(e) => setWinklerK(e.target.value)} />
            <div className="text-[10px] text-ink-dim mt-1">
              Coefficiente di sottosuolo elastico (modello Hetényi). Lascia vuoto se la
              trave non poggia su suolo. Tipici: argilla molle 1e7, terreno medio 5e7,
              roccia 1e9 N/m².
            </div>
          </div>
        )}
        {(type === "cable2d" || type === "cable3d") && (
          <div>
            <label className="label block mb-1">
              Pretensione N₀ [N] (opzionale, &gt; 0 = trazione iniziale)
            </label>
            <input className="input numeric" placeholder="es. 50000 (= 50 kN)"
                   value={pretension} onChange={(e) => setPretension(e.target.value)} />
            <div className="text-[10px] text-ink-dim mt-1">
              Stato iniziale del cavo per il solver Newton-Raphson (BL-1). Senza
              pretensione, il cavo è considerato slack a riposo e la rigidezza
              tangente è quasi nulla finché non si tende. Sezione tipica:
              <span className="font-mono ml-1">cable_d20</span> o
              <span className="font-mono ml-1">cable_d50</span>.
            </div>
          </div>
        )}
      </div>

      {/* v1.6 S0 · B13: picker modali sopra il dialog (z-50 vs z-40). */}
      <MaterialPicker
        open={matPickerOpen}
        onClose={() => setMatPickerOpen(false)}
        value={materialId}
        onChange={setMaterialId}
      />
      <SectionPicker
        open={secPickerOpen}
        onClose={() => setSecPickerOpen(false)}
        value={sectionId}
        onChange={setSectionId}
      />
    </Dialog>
  );
}
