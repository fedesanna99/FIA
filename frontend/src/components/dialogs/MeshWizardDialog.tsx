/**
 * MeshWizardDialog (Precision v2.0 PR17 T8) — wizard mesh Precision-aligned.
 *
 * 5 modi (line/shell/tri/box/parametric). Segmented control type select,
 * vec3 input compatti, parametric shape secondary picker.
 */
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog } from "./Dialog";
import { modelsApi } from "../../api/client";
import { parametricMeshApi, type ParametricShape } from "../../api/mesh";
import { useModelStore } from "../../store/modelStore";
import { toast } from "../../store/toastStore";

type Kind = "line" | "shell" | "tri" | "box" | "parametric";

interface Props {
  open: boolean;
  onClose: () => void;
}

const KIND_LABELS: Record<Kind, string> = {
  line:       "1D beam/truss",
  shell:      "2D shell Q4",
  tri:        "2D tri T3",
  box:        "3D box solid",
  parametric: "Parametrica",
};

const SHAPE_LABELS: Record<ParametricShape, string> = {
  rectangle: "Rettangolo",
  l_shape:   "L-shape",
  t_shape:   "T-shape",
  circle:    "Cerchio",
  ring:      "Anello",
};

const fieldLabel = "block font-mono text-[10px] uppercase tracking-wide-1 text-ink-3 mb-1.5";
const inputCls = "w-full px-2.5 py-1.5 text-sm bg-bg-elevated border border-border-light text-ink focus:border-accent focus:outline-none transition-colors";
const numInputCls = `${inputCls} font-mono tabular-nums`;

export function MeshWizardDialog({ open, onClose }: Props) {
  const model = useModelStore((s) => s.model);
  const setModel = useModelStore((s) => s.setModel);
  const qc = useQueryClient();
  const [kind, setKind] = useState<Kind>("line");

  const [lineP0, setLineP0] = useState<number[]>([0, 0, 0]);
  const [lineP1, setLineP1] = useState<number[]>([6, 0, 0]);
  const [lineDiv, setLineDiv] = useState(10);
  const [lineElType, setLineElType] = useState("beam2d");

  const [shellSize, setShellSize] = useState({ Lx: 2, Ly: 2 });
  const [shellMesh, setShellMesh] = useState({ nx: 4, ny: 4 });

  const [boxOrigin, setBoxOrigin] = useState<number[]>([0, 0, 0]);
  const [boxSizes, setBoxSizes] = useState<number[]>([2, 1, 1]);
  const [boxMesh, setBoxMesh] = useState({ nx: 2, ny: 1, nz: 1 });

  const [shape, setShape] = useState<ParametricShape>("rectangle");
  const [pBase, setPBase] = useState(2);
  const [pHeight, setPHeight] = useState(1);
  const [pTflange, setPTflange] = useState(0.2);
  const [pTweb, setPTweb] = useState(0.15);
  const [pRadius, setPRadius] = useState(1);
  const [pRinner, setPRinner] = useState(0.4);
  const [pSegments, setPSegments] = useState(32);
  const [pMeshSize, setPMeshSize] = useState(0.25);
  const [pOrigin, setPOrigin] = useState<number[]>([0, 0, 0]);

  // v3.3.0 audit-fix L3.2-P1-2: reset wizard state quando si chiude/riapre.
  // Prima i valori persistevano cross-istanza (es. Lx=10 dopo errore, riapri
  // per "rifare" vede ancora 10). Ora ogni open è clean slate.
  useEffect(() => {
    if (open) return; // solo su close
    // Defer per non triggerare lo state-update durante l'unmount Radix
    const t = setTimeout(() => {
      setKind("line");
      setLineP0([0, 0, 0]); setLineP1([6, 0, 0]); setLineDiv(10); setLineElType("beam2d");
      setShellSize({ Lx: 2, Ly: 2 }); setShellMesh({ nx: 4, ny: 4 });
      setBoxOrigin([0, 0, 0]); setBoxSizes([2, 1, 1]); setBoxMesh({ nx: 2, ny: 1, nz: 1 });
      setShape("rectangle"); setPBase(2); setPHeight(1); setPTflange(0.2); setPTweb(0.15);
      setPRadius(1); setPRinner(0.4); setPSegments(32); setPMeshSize(0.25); setPOrigin([0, 0, 0]);
    }, 200);
    return () => clearTimeout(t);
  }, [open]);
  const [pMaterial, setPMaterial] = useState("steel_s355");
  const [pSection, setPSection] = useState("shell_t100");

  const mut = useMutation({
    mutationFn: async () => {
      if (!model) throw new Error("Nessun modello selezionato");

      if (kind === "line") {
        return modelsApi.meshLine(model.id, {
          p0: lineP0 as [number, number, number],
          p1: lineP1 as [number, number, number],
          n_div: lineDiv,
          material_id: "steel_s355",
          section_id: lineElType.startsWith("truss") ? "circ_100" : "ipe_300",
          element_type: lineElType,
        });
      }
      if (kind === "shell") {
        const { Lx, Ly } = shellSize;
        return modelsApi.meshShell(model.id, {
          p0: [0, 0, 0], p1: [Lx, 0, 0], p2: [Lx, Ly, 0], p3: [0, Ly, 0],
          nx: shellMesh.nx, ny: shellMesh.ny,
          material_id: "steel_s355", section_id: "shell_t100",
        });
      }
      if (kind === "tri") {
        const { Lx, Ly } = shellSize;
        return modelsApi.meshTri(model.id, {
          p0: [0, 0, 0], p1: [Lx, 0, 0], p2: [Lx, Ly, 0], p3: [0, Ly, 0],
          nx: shellMesh.nx, ny: shellMesh.ny,
          material_id: "steel_s355", section_id: "shell_t100",
        });
      }
      if (kind === "box") {
        return modelsApi.meshBox(model.id, {
          origin: boxOrigin as [number, number, number],
          sizes: boxSizes as [number, number, number],
          nx: boxMesh.nx, ny: boxMesh.ny, nz: boxMesh.nz,
          material_id: "concrete_c30",
        });
      }
      const params = buildShapeParams(shape, {
        b: pBase, h: pHeight, tf: pTflange, tw: pTweb,
        r: pRadius, r_outer: pRadius, r_inner: pRinner,
        n_segments: pSegments,
      });
      const resp = await parametricMeshApi.generate(model.id, {
        shape, params, h: pMeshSize,
        element_type: "tri3",
        material_id: pMaterial,
        section_id: pSection,
        origin: pOrigin as [number, number, number],
      });
      return { resp, refetched: true };
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onSuccess: async (r: any) => {
      if (r?.refetched) {
        const fresh = await modelsApi.get(model!.id);
        setModel(fresh);
        toast("success", `Mesh parametrica: +${r.resp.added_nodes} nodi, +${r.resp.added_elements} elementi`);
      } else if (r?.model) {
        setModel(r.model);
      }
      qc.invalidateQueries({ queryKey: ["model", model?.id] });
      onClose();
    },
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Wizard mesh"
      width={600}
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
            onClick={() => mut.mutate()}
            disabled={mut.isPending}
            className="inline-flex items-center gap-1.5 bg-accent text-white border border-accent px-4 py-1.5 text-sm font-medium hover:bg-accent-hover disabled:opacity-50 disabled:cursor-wait"
          >
            {mut.isPending && (
              <span className="inline-block w-3 h-3 border-[1.5px] border-white/40 border-t-white animate-spin" />
            )}
            {mut.isPending ? "Genero…" : "Genera mesh"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Tipo mesh — segmented control */}
        <div>
          <div className={fieldLabel}>Tipo mesh</div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-0 border border-border bg-bg-panel p-0.5">
            {(Object.keys(KIND_LABELS) as Kind[]).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={[
                  "px-2 py-1.5 font-mono text-[10px] uppercase tracking-wide-1 font-semibold transition-colors",
                  kind === k
                    ? "bg-accent text-white"
                    : "text-ink-3 hover:text-ink hover:bg-bg-hover",
                ].join(" ")}
              >
                {KIND_LABELS[k]}
              </button>
            ))}
          </div>
        </div>

        {mut.error && (
          <div className="flex items-start gap-2 px-3 py-2 bg-bg-danger border border-danger/40 text-sm text-danger">
            <span className="font-mono text-[11px] uppercase tracking-wide-1 font-semibold flex-shrink-0">!</span>
            <span>{(mut.error as Error).message}</span>
          </div>
        )}

        {kind === "line" && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Vec3Field label="P₀" value={lineP0} onChange={setLineP0} />
              <Vec3Field label="P₁" value={lineP1} onChange={setLineP1} />
              <label className="block">
                <span className={fieldLabel}>N° divisioni</span>
                <input type="number" className={numInputCls} min={1} value={lineDiv}
                       onChange={(e) => setLineDiv(Number(e.target.value))} />
              </label>
            </div>
            <label className="block">
              <span className={fieldLabel}>Tipo elemento</span>
              <select className={inputCls} value={lineElType} onChange={(e) => setLineElType(e.target.value)}>
                <option value="beam2d">Beam 2D</option>
                <option value="beam3d">Beam 3D</option>
                <option value="truss2d">Truss 2D</option>
                <option value="truss3d">Truss 3D</option>
              </select>
            </label>
          </div>
        )}

        {(kind === "shell" || kind === "tri") && (
          <div className="grid grid-cols-2 gap-3">
            <NumField label="Lx" unit="[m]" value={shellSize.Lx} onChange={(v) => setShellSize({ ...shellSize, Lx: v })} />
            <NumField label="Ly" unit="[m]" value={shellSize.Ly} onChange={(v) => setShellSize({ ...shellSize, Ly: v })} />
            <NumField label="nx celle" value={shellMesh.nx} onChange={(v) => setShellMesh({ ...shellMesh, nx: v })} />
            <NumField label="ny celle" value={shellMesh.ny} onChange={(v) => setShellMesh({ ...shellMesh, ny: v })} />
          </div>
        )}

        {kind === "box" && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Vec3Field label="Origine" value={boxOrigin} onChange={setBoxOrigin} />
              <Vec3Field label="Sizes · Lx Ly Lz" value={boxSizes} onChange={setBoxSizes} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <NumField label="nx" value={boxMesh.nx} onChange={(v) => setBoxMesh({ ...boxMesh, nx: v })} />
              <NumField label="ny" value={boxMesh.ny} onChange={(v) => setBoxMesh({ ...boxMesh, ny: v })} />
              <NumField label="nz" value={boxMesh.nz} onChange={(v) => setBoxMesh({ ...boxMesh, nz: v })} />
            </div>
          </div>
        )}

        {kind === "parametric" && (
          <div className="space-y-3">
            <label className="block">
              <span className={fieldLabel}>Forma</span>
              <select className={inputCls} value={shape} onChange={(e) => setShape(e.target.value as ParametricShape)}>
                {(Object.keys(SHAPE_LABELS) as ParametricShape[]).map((s) => (
                  <option key={s} value={s}>{SHAPE_LABELS[s]}</option>
                ))}
              </select>
            </label>

            {(shape === "rectangle" || shape === "l_shape" || shape === "t_shape") && (
              <div className="grid grid-cols-2 gap-3">
                <NumField label="b base" unit="[m]" value={pBase} onChange={setPBase} />
                <NumField label="h altezza" unit="[m]" value={pHeight} onChange={setPHeight} />
              </div>
            )}
            {(shape === "l_shape" || shape === "t_shape") && (
              <div className="grid grid-cols-2 gap-3">
                <NumField label="tf flangia" unit="[m]" value={pTflange} onChange={setPTflange} />
                <NumField label="tw anima" unit="[m]" value={pTweb} onChange={setPTweb} />
              </div>
            )}
            {shape === "circle" && (
              <div className="grid grid-cols-2 gap-3">
                <NumField label="r raggio" unit="[m]" value={pRadius} onChange={setPRadius} />
                <NumField label="Segmenti" value={pSegments} onChange={setPSegments} />
              </div>
            )}
            {shape === "ring" && (
              <div className="grid grid-cols-3 gap-3">
                <NumField label="r esterno" unit="[m]" value={pRadius} onChange={setPRadius} />
                <NumField label="r interno" unit="[m]" value={pRinner} onChange={setPRinner} />
                <NumField label="Segmenti" value={pSegments} onChange={setPSegments} />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <NumField label="Mesh size h" unit="[m]" value={pMeshSize} onChange={setPMeshSize} />
              <Vec3Field label="Origine" value={pOrigin} onChange={setPOrigin} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className={fieldLabel}>Materiale</span>
                <input className={numInputCls} value={pMaterial} onChange={(e) => setPMaterial(e.target.value)} />
              </label>
              <label className="block">
                <span className={fieldLabel}>Sezione</span>
                <input className={numInputCls} value={pSection} onChange={(e) => setPSection(e.target.value)} />
              </label>
            </div>
            <div className="text-[11px] text-ink-3 leading-snug">
              Mesher Delaunay. I parametri b/h/tf/tw seguono le convenzioni EN 10025 per sezioni a L e T.
              Per cerchio/anello aumenta i segmenti per ridurre la discretizzazione del bordo.
            </div>
          </div>
        )}

        <div className="text-[11px] text-ink-3 pt-1 border-t border-border">
          La mesh viene aggiunta al modello corrente · i numeri di nodi/elementi vengono rimappati.
        </div>
      </div>
    </Dialog>
  );
}

function NumField({ label, unit, value, onChange }: {
  label: string;
  unit?: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <span className={fieldLabel}>
        {label}
        {unit && <span className="text-ink-4 normal-case tracking-normal ml-1">{unit}</span>}
      </span>
      <input
        type="number"
        step="0.01"
        className={numInputCls}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

function Vec3Field({ label, value, onChange }: {
  label: string;
  value: number[];
  onChange: (v: number[]) => void;
}) {
  return (
    <div>
      <span className={fieldLabel}>{label}</span>
      <div className="grid grid-cols-3 gap-1">
        {value.map((v, i) => (
          <input
            key={i}
            type="number"
            step="0.1"
            className={`${numInputCls} text-center px-1.5`}
            value={v}
            onChange={(e) => {
              const next = [...value];
              next[i] = Number(e.target.value);
              onChange(next);
            }}
          />
        ))}
      </div>
    </div>
  );
}

function buildShapeParams(shape: ParametricShape, all: Record<string, number>): Record<string, number> {
  switch (shape) {
    case "rectangle":
      return { b: all.b, h: all.h };
    case "l_shape":
    case "t_shape":
      return { b: all.b, h: all.h, tf: all.tf, tw: all.tw };
    case "circle":
      return { r: all.r, n_segments: all.n_segments };
    case "ring":
      return { r_outer: all.r_outer, r_inner: all.r_inner, n_segments: all.n_segments };
  }
}
