/**
 * ElementDialog (Precision v2.0 PR17 T7) — Precision-aligned.
 *
 * Aggiunge/modifica elemento finito. Hairline borders, mono labels,
 * picker buttons per material/section, releases/winkler/pretension opzionali.
 */
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
  { value: "beam2d",        label: "Beam 2D",                       nodeCount: 2 },
  { value: "beam3d",        label: "Beam 3D",                       nodeCount: 2 },
  { value: "truss2d",       label: "Truss 2D",                      nodeCount: 2 },
  { value: "truss3d",       label: "Truss 3D",                      nodeCount: 2 },
  { value: "cable2d",       label: "Cable 2D · tension-only",       nodeCount: 2 },
  { value: "cable3d",       label: "Cable 3D · tension-only",       nodeCount: 2 },
  { value: "tri3",          label: "Tri T3 · plane-stress",         nodeCount: 3 },
  { value: "shell_q4",      label: "Shell Q4",                      nodeCount: 4 },
  { value: "shell_q4_mitc", label: "Shell Q4 MITC4 · anti-locking", nodeCount: 4 },
  { value: "solid_h8",      label: "Solid H8",                      nodeCount: 8 },
  { value: "solid_t4",      label: "Solid Tet4",                    nodeCount: 4 },
  { value: "solid_t10",     label: "Solid Tet10 · quadratic",       nodeCount: 10 },
];

const fieldLabel = "block font-mono text-[10px] uppercase tracking-wide-1 text-ink-3 mb-1.5";
const inputCls = "w-full px-2.5 py-1.5 text-sm bg-bg-elevated border border-border-light text-ink focus:border-accent focus:outline-none transition-colors disabled:bg-bg-hover disabled:text-ink-3 disabled:cursor-not-allowed";

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

  const [matPickerOpen, setMatPickerOpen] = useState(false);
  const [secPickerOpen, setSecPickerOpen] = useState(false);
  const selectedMaterial = materials?.find((m) => m.id === materialId);
  const selectedSection = sections?.find((s) => s.id === sectionId);

  const expected = ELEMENT_OPTIONS.find((o) => o.value === type)?.nodeCount ?? 2;

  const mutation = useMutation({
    mutationFn: () => {
      if (!model) throw new Error("Nessun modello");
      // v3.3.0 audit-fix L3.2-P1-7: `.filter(Boolean)` esclude ID 0 (falsy).
      // Sistemi 0-based avrebbero perso nodo silenziosamente.
      const nodeIds = nodesText.split(",").map((s) => Number(s.trim())).filter((n) => Number.isFinite(n));
      if (nodeIds.length !== expected) {
        throw new Error(`L'elemento ${type} richiede ${expected} nodi (${nodeIds.length} forniti)`);
      }
      const releases = releasesText.trim()
        ? releasesText.split(",").map((s) => Number(s.trim())).filter((n) => Number.isFinite(n))
        : undefined;
      const wk = winklerK.trim() ? Number(winklerK) : undefined;
      const pt = pretension.trim() ? Number(pretension) : undefined;
      const isCable = type === "cable2d" || type === "cable3d";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const payload: any = {
        id, type, nodes: nodeIds,
        material_id: materialId,
        section_id: sectionId,
        releases,
        ...(type === "beam2d" && wk != null && Number.isFinite(wk) ? { winkler_k: wk } : {}),
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
      width={520}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-sm font-medium text-ink-2 hover:text-ink hover:bg-bg-hover"
          >
            Annulla
          </button>
          <button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            data-testid="element-save"
            className="inline-flex items-center gap-1.5 bg-accent text-white border border-accent px-4 py-1.5 text-sm font-medium hover:bg-accent-hover disabled:opacity-50 disabled:cursor-wait"
          >
            {mutation.isPending && (
              <span className="inline-block w-3 h-3 border-[1.5px] border-white/40 border-t-white animate-spin" />
            )}
            {mutation.isPending ? "..." : (editing ? "Salva" : "Aggiungi elemento")}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {mutation.isError && (
          <div className="flex items-start gap-2 px-3 py-2 bg-bg-danger border border-danger/40 text-sm text-danger">
            <span className="font-mono text-[11px] uppercase tracking-wide-1 font-semibold flex-shrink-0">!</span>
            <span>{(mutation.error as Error).message}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block">
            <span className={fieldLabel}>ID elemento</span>
            <input type="number" className={`${inputCls} font-mono tabular-nums`} value={id}
                   onChange={(e) => setId(Number(e.target.value))} disabled={!!editing} />
          </label>
          <label className="block">
            <span className={fieldLabel}>Tipo</span>
            <select className={inputCls} value={type} onChange={(e) => setType(e.target.value as ElementType)}
                    disabled={!!editing}>
              {ELEMENT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
        </div>

        <label className="block">
          <span className={fieldLabel}>
            Nodi <span className="text-ink-4 normal-case tracking-normal">· CSV, {expected} richiesti</span>
          </span>
          <input className={`${inputCls} font-mono tabular-nums`} placeholder="es. 1,2"
                 value={nodesText} onChange={(e) => setNodesText(e.target.value)} />
          {!editing && selectedNodes.size > 0 && (
            <button
              type="button"
              className="font-mono text-[10px] uppercase tracking-wide-1 text-accent mt-1.5 hover:underline"
              onClick={() => setNodesText(Array.from(selectedNodes).join(","))}
            >
              Usa selezione corrente · {selectedNodes.size} nodi
            </button>
          )}
        </label>

        {/* Picker rows */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <div className={fieldLabel}>Materiale</div>
            <button
              type="button"
              onClick={() => setMatPickerOpen(true)}
              data-testid="element-material-pick"
              className={`${inputCls} text-left flex items-center justify-between hover:border-accent`}
            >
              <span className="truncate">
                {selectedMaterial?.name ?? <span className="text-ink-3">Scegli…</span>}
              </span>
              <span className="font-mono text-[10px] text-ink-3 ml-2 flex-shrink-0">cambia</span>
            </button>
          </div>
          <div>
            <div className={fieldLabel}>Sezione</div>
            <button
              type="button"
              onClick={() => setSecPickerOpen(true)}
              data-testid="element-section-pick"
              className={`${inputCls} text-left flex items-center justify-between hover:border-accent`}
            >
              <span className="truncate">
                {selectedSection?.name ?? <span className="text-ink-3">Scegli…</span>}
              </span>
              <span className="font-mono text-[10px] text-ink-3 ml-2 flex-shrink-0">cambia</span>
            </button>
          </div>
        </div>

        {/* Beam-only: releases */}
        {(type === "beam2d" || type === "beam3d") && (
          <label className="block">
            <span className={fieldLabel}>
              Releases <span className="text-ink-4 normal-case tracking-normal">· opzionale, cerniere interne</span>
            </span>
            <input className={`${inputCls} font-mono tabular-nums`} placeholder="es. 5 oppure 2,5"
                   value={releasesText} onChange={(e) => setReleasesText(e.target.value)} />
            <div className="text-[11px] text-ink-3 mt-1.5 leading-snug">
              Indici dof locali da rilasciare. Beam2D: 2=θ_i, 5=θ_j · Beam3D: 3-5=θ_i, 9-11=θ_j.
            </div>
          </label>
        )}

        {/* Beam2D-only: Winkler */}
        {type === "beam2d" && (
          <label className="block">
            <span className={`${fieldLabel} flex items-center gap-1.5`}>
              Suolo Winkler k [N/m²] <span className="text-ink-4 normal-case tracking-normal">· opzionale</span>
              <TipBubble tipId="winkler-k" />
            </span>
            <input className={`${inputCls} font-mono tabular-nums`} placeholder="es. 5e7 per terreno medio"
                   value={winklerK} onChange={(e) => setWinklerK(e.target.value)} />
            <div className="text-[11px] text-ink-3 mt-1.5 leading-snug">
              Coefficiente di sottosuolo elastico (modello Hetényi). Lascia vuoto se la trave non
              poggia su suolo. Tipici: argilla molle 1e7 · terreno medio 5e7 · roccia 1e9 N/m².
            </div>
          </label>
        )}

        {/* Cable-only: pretension */}
        {(type === "cable2d" || type === "cable3d") && (
          <label className="block">
            <span className={fieldLabel}>
              Pretensione N₀ [N] <span className="text-ink-4 normal-case tracking-normal">· opzionale, &gt; 0 trazione iniziale</span>
            </span>
            <input className={`${inputCls} font-mono tabular-nums`} placeholder="es. 50000 (= 50 kN)"
                   value={pretension} onChange={(e) => setPretension(e.target.value)} />
            <div className="text-[11px] text-ink-3 mt-1.5 leading-snug">
              Stato iniziale del cavo per il solver Newton-Raphson. Senza pretensione, il cavo è
              slack a riposo e la rigidezza tangente è quasi nulla finché non si tende. Sezioni
              tipiche: <span className="font-mono text-ink-2">cable_d20</span> o{" "}
              <span className="font-mono text-ink-2">cable_d50</span>.
            </div>
          </label>
        )}
      </div>

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
