/**
 * ImportWizard (v1.5 Task 29) — wizard 4 step che sostituisce I/O legacy.
 *
 * Step:
 *   1. Fonte    → 4 card (DXF / IFC4 / JSON nativo / Template)
 *   2. File     → drop-zone + 3 default editabili (materiale/sezione/tol dedupe)
 *   3. Anteprima → SVG wireframe + summary tabellare + warnings dell'importer
 *   4. Conferma → success card con 3 azioni (Apri viewport · Importa altro · Chiudi)
 *
 * Riusa il pattern WizardShell del Task 31. Al success dispatcha
 * `feapro:model-imported` con `{ id }` cosi' App.tsx aggiorna activeId.
 */
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileUp, FileBox, FileJson, Layers, CheckCircle2, AlertTriangle,
  ArrowUpRight, RotateCcw,
} from "lucide-react";
import type { FEAModel } from "../../../types/model";
import { importDxf, importIfc } from "../../../api/io";
import { modelsApi } from "../../../api/client";
import { useModelStore } from "../../../store/modelStore";
import { toast } from "../../../store/toastStore";
import { WizardShell } from "./WizardShell";


type ImportSource = "dxf" | "ifc" | "json" | "template";


interface Props {
  open: boolean;
  onClose: () => void;
  /** Pre-seleziona la fonte (es. lancio da palette "import dxf"). */
  initialSource?: ImportSource;
}


interface ImportState {
  source: ImportSource;
  file: File | null;
  defaultMaterial: string;
  defaultSection: string;
  tolDedupe: number;
}


const INITIAL_STATE: ImportState = {
  source: "dxf",
  file: null,
  defaultMaterial: "steel_s355",
  defaultSection: "ipe_300",
  tolDedupe: 1e-6,
};


export function ImportWizard({ open, onClose, initialSource }: Props) {
  const [step, setStep] = useState(0);
  const [state, setState] = useState<ImportState>({
    ...INITIAL_STATE,
    source: initialSource ?? INITIAL_STATE.source,
  });
  const [imported, setImported] = useState<{ model: FEAModel; warnings: string[] } | null>(null);

  const setModel = useModelStore((s) => s.setModel);
  const qc = useQueryClient();

  const importMut = useMutation({
    mutationFn: async (s: ImportState) => {
      if (!s.file && s.source !== "template") throw new Error("Nessun file selezionato");
      switch (s.source) {
        case "dxf":
          return importDxf(s.file!, {
            material_id: s.defaultMaterial,
            section_id: s.defaultSection,
            tol: s.tolDedupe,
          });
        case "ifc":
          return importIfc(s.file!);
        case "json": {
          const text = await s.file!.text();
          const payload = JSON.parse(text) as FEAModel;
          if (!payload.nodes || !payload.elements) {
            throw new Error("JSON non riconosciuto: mancano nodes/elements.");
          }
          const m = await modelsApi.importJson(payload);
          return { model: m, warnings: [] };
        }
        case "template":
          throw new Error("Template library presto disponibile.");
      }
    },
    onSuccess: (res) => {
      setImported(res);
      setStep(2); // → Anteprima
    },
    onError: (e) => toast("error", `Errore import: ${(e as Error).message}`),
  });

  const confirmImport = () => {
    if (!imported) return;
    setModel(imported.model);
    qc.invalidateQueries({ queryKey: ["models"] });
    window.dispatchEvent(
      new CustomEvent("feapro:model-imported", { detail: { id: imported.model.id } }),
    );
    toast(
      "success",
      `Modello "${imported.model.name}" importato (${imported.model.nodes.length} nodi).`,
    );
    setStep(3); // → Conferma success
  };

  const reset = () => {
    setStep(0);
    setState({ ...INITIAL_STATE, source: initialSource ?? INITIAL_STATE.source });
    setImported(null);
  };
  const handleClose = () => { onClose(); reset(); };

  const canProceed = useMemo(() => {
    if (step === 0) return state.source !== "template"; // template non ancora pronto
    if (step === 1) return state.file !== null && !importMut.isPending;
    if (step === 2) return imported !== null;
    return true;
  }, [step, state, importMut.isPending, imported]);

  const handleNext = () => {
    if (step === 0) setStep(1);
    else if (step === 1) importMut.mutate(state);
    else if (step === 2) confirmImport();
  };

  return (
    <WizardShell
      open={open}
      title="Importa modello"
      breadcrumb={[
        { label: "I/O", icon: FileUp },
        { label: "Importa", icon: ArrowUpRight },
      ]}
      steps={[
        { id: "source",   label: "Fonte" },
        { id: "file",     label: "File" },
        { id: "preview",  label: "Anteprima" },
        { id: "done",     label: "Conferma" },
      ]}
      currentStep={step}
      onClose={handleClose}
      onBack={step > 0 && step < 3 ? () => setStep((s) => s - 1) : undefined}
      onNext={handleNext}
      canProceed={canProceed}
      isSubmitting={importMut.isPending}
      nextLabel={step === 1 ? "Importa" : step === 2 ? "Conferma" : "Avanti"}
      submitLabel="Chiudi"
      onSubmit={handleClose}
    >
      {step === 0 && <SourceStep state={state} setState={setState} />}
      {step === 1 && <FileStep state={state} setState={setState} pending={importMut.isPending} />}
      {step === 2 && imported && (
        <PreviewStep model={imported.model} warnings={imported.warnings} />
      )}
      {step === 3 && imported && (
        <DoneStep model={imported.model} onReset={reset} onClose={handleClose} />
      )}
    </WizardShell>
  );
}


// ── Step 1: Fonte ──────────────────────────────────────────────────────────
const SOURCES: { id: ImportSource; label: string; sub: string; icon: typeof FileUp; soon?: boolean }[] = [
  { id: "dxf",      label: "File DXF",     sub: "LINE/POLYLINE → BEAM 2D/3D",        icon: FileUp },
  { id: "ifc",      label: "File IFC4",    sub: "IfcBeam/Column/Member → BEAM 3D",   icon: FileBox },
  { id: "json",     label: "JSON nativo",  sub: "Re-import FEA Pro (lossless)",      icon: FileJson },
  { id: "template", label: "Template",     sub: "8 preset (presto disponibile)",     icon: Layers, soon: true },
];

function SourceStep({
  state, setState,
}: {
  state: ImportState;
  setState: React.Dispatch<React.SetStateAction<ImportState>>;
}) {
  return (
    <div className="space-y-4">
      <p className="text-[12px] text-ink-muted leading-relaxed">
        Scegli da dove vuoi importare il modello strutturale. Per file CAD
        tipici (architetto / topografo) usa DXF. Per modelli BIM completi usa IFC.
      </p>
      <div className="grid grid-cols-2 gap-2.5">
        {SOURCES.map((s) => {
          const Icon = s.icon;
          const active = state.source === s.id;
          return (
            <button
              key={s.id}
              type="button"
              disabled={s.soon}
              onClick={() => setState((prev) => ({ ...prev, source: s.id, file: null }))}
              data-testid={`wiz-source-${s.id}`}
              className={`text-left p-3 rounded-lg border transition ${
                active
                  ? "border-accent bg-bg-info ring-2 ring-accent/30"
                  : s.soon
                  ? "border-border bg-bg-panel opacity-50 cursor-not-allowed"
                  : "border-border bg-bg-panel hover:border-accent/40 hover:bg-bg-hover"
              }`}
            >
              <div className="flex items-start gap-2.5">
                <div className={`w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 ${
                  active ? "bg-accent/15 text-accent" : "bg-bg-hover text-ink-muted"
                }`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-ink flex items-center gap-1.5">
                    {s.label}
                    {s.soon && (
                      <span className="text-[9px] uppercase font-mono text-ink-dim border border-border rounded-sm px-1">
                        soon
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-ink-muted mt-0.5">{s.sub}</div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}


// ── Step 2: File ───────────────────────────────────────────────────────────
function FileStep({
  state, setState, pending,
}: {
  state: ImportState;
  setState: React.Dispatch<React.SetStateAction<ImportState>>;
  pending: boolean;
}) {
  const accept = state.source === "dxf" ? ".dxf"
    : state.source === "ifc" ? ".ifc"
    : ".json,application/json";
  const showDefaults = state.source === "dxf";

  return (
    <div className="space-y-4">
      <FilePicker
        accept={accept}
        file={state.file}
        disabled={pending}
        onFile={(f) => setState((prev) => ({ ...prev, file: f }))}
      />

      {showDefaults && (
        <div className="border border-border rounded-md p-3 bg-bg-panel space-y-2.5">
          <div className="text-[10px] uppercase tracking-wider text-ink-muted font-semibold">
            Default elementi DXF
          </div>
          <DefaultRow
            label="Materiale"
            value={state.defaultMaterial}
            onChange={(v) => setState((p) => ({ ...p, defaultMaterial: v }))}
          />
          <DefaultRow
            label="Sezione"
            value={state.defaultSection}
            onChange={(v) => setState((p) => ({ ...p, defaultSection: v }))}
          />
          <DefaultRow
            label="Tolleranza dedupe [m]"
            value={String(state.tolDedupe)}
            onChange={(v) => {
              const n = parseFloat(v);
              if (!Number.isNaN(n)) setState((p) => ({ ...p, tolDedupe: n }));
            }}
            type="number"
            step="1e-7"
          />
          <div className="flex items-start gap-2 px-2 py-1.5 bg-bg-success border border-success/20 rounded-md">
            <CheckCircle2 className="w-3.5 h-3.5 text-ink-success mt-0.5 shrink-0" />
            <p className="text-[10px] text-ink-success leading-snug">
              Va bene così per la maggior parte dei casi. Modifica solo se sai
              cosa stai cambiando.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function DefaultRow({
  label, value, onChange, type = "text", step,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: "text" | "number";
  step?: string;
}) {
  return (
    <label className="flex items-center justify-between gap-3 py-1">
      <span className="text-[11px] text-ink-muted">{label}</span>
      <input
        type={type}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-7 w-32 text-[11px] px-2 rounded bg-bg-elevated border border-border text-ink font-mono text-right focus:outline-none focus:border-accent/60"
      />
    </label>
  );
}

function FilePicker({
  accept, file, disabled, onFile,
}: {
  accept: string;
  file: File | null;
  disabled: boolean;
  onFile: (f: File) => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  return (
    <label
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (disabled) return;
        const f = e.dataTransfer.files?.[0];
        if (f) onFile(f);
      }}
      className={`flex flex-col items-center gap-2 p-6 rounded-md border-2 border-dashed transition cursor-pointer ${
        dragOver ? "border-accent bg-accent/5" : "border-border bg-bg-panel hover:border-accent/40"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      <FileUp className="w-6 h-6 text-ink-muted" />
      <div className="text-[11px] text-ink-muted text-center">
        {file ? (
          <>
            <span className="font-semibold text-ink">{file.name}</span>
            <span className="block text-[10px] text-ink-dim">
              {(file.size / 1024).toFixed(1)} KB · clicca per cambiare
            </span>
          </>
        ) : (
          <>
            <span className="font-semibold text-ink">Trascina o clicca</span>
            <span className="block text-[10px] text-ink-dim">{accept}</span>
          </>
        )}
      </div>
      <input
        type="file"
        accept={accept}
        disabled={disabled}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
        className="hidden"
      />
    </label>
  );
}


// ── Step 3: Anteprima ─────────────────────────────────────────────────────
function PreviewStep({ model, warnings }: { model: FEAModel; warnings: string[] }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <SvgPreview model={model} />
        <SummaryTable model={model} />
      </div>

      {warnings.length > 0 && (
        <div className="flex items-start gap-2 px-3 py-2 bg-bg-warn/30 border border-warn/40 rounded-md">
          <AlertTriangle className="w-3.5 h-3.5 text-ink-warn mt-0.5 shrink-0" />
          <div className="text-[11px] text-ink leading-snug">
            <div className="font-semibold mb-0.5">{warnings.length} warning</div>
            <ul className="space-y-0.5 max-h-20 overflow-y-auto">
              {warnings.slice(0, 5).map((w, i) => (
                <li key={i} className="text-[10px] text-ink-muted">· {w}</li>
              ))}
              {warnings.length > 5 && (
                <li className="text-[10px] text-ink-dim italic">+{warnings.length - 5} altri</li>
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function SvgPreview({ model }: { model: FEAModel }) {
  // Proiezione XY semplificata. Calcoliamo bounding box e scale-fit a 200x140.
  const W = 200, H = 140, PAD = 8;
  const xs = model.nodes.map((n) => n.x);
  const ys = model.nodes.map((n) => n.y);
  const xMin = Math.min(...xs, 0), xMax = Math.max(...xs, 1);
  const yMin = Math.min(...ys, 0), yMax = Math.max(...ys, 1);
  const dx = xMax - xMin || 1, dy = yMax - yMin || 1;
  const scale = Math.min((W - 2 * PAD) / dx, (H - 2 * PAD) / dy);
  const cx = (W - dx * scale) / 2 - xMin * scale;
  const cy = (H - dy * scale) / 2 - yMin * scale;
  const project = (x: number, y: number): [number, number] => [
    cx + x * scale,
    H - (cy + y * scale), // SVG y-down
  ];

  return (
    <div className="border border-border rounded-md p-2 bg-bg-panel">
      <div className="text-[10px] uppercase tracking-wider text-ink-muted font-semibold mb-1.5">
        Wireframe (proiezione XY)
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto bg-bg-elevated rounded-sm">
        {model.elements.slice(0, 500).map((el) => {
          if (el.nodes.length < 2) return null;
          const n1 = model.nodes.find((n) => n.id === el.nodes[0]);
          const n2 = model.nodes.find((n) => n.id === el.nodes[1]);
          if (!n1 || !n2) return null;
          const [x1, y1] = project(n1.x, n1.y);
          const [x2, y2] = project(n2.x, n2.y);
          return (
            <line key={el.id} x1={x1} y1={y1} x2={x2} y2={y2}
              stroke="rgb(var(--c-accent))" strokeWidth="0.8" />
          );
        })}
        {model.nodes.slice(0, 200).map((n) => {
          const [x, y] = project(n.x, n.y);
          return <circle key={n.id} cx={x} cy={y} r="1.4" fill="rgb(var(--c-accent))" />;
        })}
      </svg>
    </div>
  );
}

function SummaryTable({ model }: { model: FEAModel }) {
  return (
    <div className="border border-border rounded-md p-3 bg-bg-panel">
      <div className="text-[10px] uppercase tracking-wider text-ink-muted font-semibold mb-2">
        Riepilogo
      </div>
      <dl className="space-y-1.5 text-[11px]">
        <SummaryRow label="Nome" value={model.name} />
        <SummaryRow label="Tipo" value={model.is_3d ? "3D" : "2D"} />
        <SummaryRow label="Unità" value={model.units} />
        <SummaryRow label="Nodi" value={String(model.nodes.length)} />
        <SummaryRow label="Elementi" value={String(model.elements.length)} />
        <SummaryRow label="Carichi" value={String(model.loads.length)} />
        <SummaryRow label="Vincoli" value={String(model.constraints.length)} />
      </dl>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="font-mono font-semibold text-ink truncate">{value}</dd>
    </div>
  );
}


// ── Step 4: Conferma ──────────────────────────────────────────────────────
function DoneStep({
  model, onReset, onClose,
}: {
  model: FEAModel;
  onReset: () => void;
  onClose: () => void;
}) {
  return (
    <div className="text-center py-4 space-y-4">
      <div className="w-14 h-14 mx-auto rounded-full bg-bg-success border-2 border-success/40 flex items-center justify-center">
        <CheckCircle2 className="w-7 h-7 text-ink-success" />
      </div>
      <div>
        <h2 className="text-base font-semibold text-ink">Importazione completata</h2>
        <p className="text-[12px] text-ink-muted mt-1">
          <span className="font-semibold text-ink">"{model.name}"</span> aperto nel viewport
          <br />
          {model.nodes.length} nodi · {model.elements.length} elementi
        </p>
      </div>
      <div className="space-y-1.5">
        <button
          type="button"
          onClick={onClose}
          className="w-full bg-accent hover:bg-accent-hover text-white text-[12px] font-semibold py-2 rounded-md transition-colors flex items-center justify-center gap-1.5"
          data-testid="wiz-done-open"
        >
          <ArrowUpRight className="w-3.5 h-3.5" />
          Apri nel viewport
        </button>
        <button
          type="button"
          onClick={onReset}
          className="w-full bg-bg-panel border border-border text-ink-muted hover:text-ink hover:bg-bg-hover text-[12px] py-2 rounded-md transition-colors flex items-center justify-center gap-1.5"
        >
          <RotateCcw className="w-3 h-3" />
          Importa un altro file
        </button>
      </div>
    </div>
  );
}
