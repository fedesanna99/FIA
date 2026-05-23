/**
 * SismicaTHWizard (v1.5 Task 31).
 *
 * Wizard 3 step che sostituisce il form denso di SeismicTHPanel:
 *   1. Direzioni     → check X/Y/Z (default X+Y)
 *   2. Accelerogrammi → per ogni asse attivo: catalogo / sintetico
 *   3. Parametri     → dt, t_end, damping ξ, Rayleigh ω_lo/ω_hi (collassati)
 *
 * Mantiene tutta la logica solver invariata: buildSolveParams costruisce
 * il payload identico a quello del panel originale, riusa accelerogramsApi,
 * useCostPreview, useJobRun.
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Zap, Activity, ChevronDown, ChevronRight } from "lucide-react";
import { useModelStore } from "../../../store/modelStore";
import { accelerogramsApi } from "../../../api/io";
import { useCostPreview } from "../../../hooks/useCostPreview";
import { useJobRun } from "../../../hooks/useJobRun";
import { toast } from "../../../store/toastStore";
import { WizardShell } from "./WizardShell";
import { CostPreviewDialog } from "../billing/CostPreviewDialog";


type Axis = "X" | "Y" | "Z";
type Source = "off" | "catalog" | "synthetic";


interface AxisCfg {
  source: Source;
  filename?: string;
  algorithm?: "kanai_tajimi" | "boore";
  duration?: number;
  dt?: number;
  pga?: number;
  seed?: number;
}


const DEFAULT_AXIS: AxisCfg = {
  source: "off",
  algorithm: "kanai_tajimi",
  duration: 20,
  dt: 0.01,
  pga: 3.5,
  seed: 42,
};


interface Props {
  open: boolean;
  onClose: () => void;
}


export function SismicaTHWizard({ open, onClose }: Props) {
  const model = useModelStore((s) => s.model);
  const [step, setStep] = useState(0);
  const [axes, setAxes] = useState<Record<Axis, AxisCfg>>({
    X: { ...DEFAULT_AXIS, source: "catalog" },
    Y: { ...DEFAULT_AXIS, source: "catalog" },
    Z: { ...DEFAULT_AXIS },
  });
  const [dt, setDt] = useState(0.01);
  const [tEnd, setTEnd] = useState(20);
  const [xi, setXi] = useState(0.05);
  const [omegaLo, setOmegaLo] = useState(0.5);
  const [omegaHi, setOmegaHi] = useState(10.0);
  const [advanced, setAdvanced] = useState(false);

  const { data: catalog } = useQuery({
    queryKey: ["accelerograms"],
    queryFn: () => accelerogramsApi.list(),
  });

  const activeAxes = useMemo(
    () => (["X", "Y", "Z"] as Axis[]).filter((a) => axes[a].source !== "off"),
    [axes],
  );

  const job = useJobRun<unknown>({
    onSuccess: () => {
      toast("success", "Sismica time-history completata — apri il workspace Risultati.");
      onClose();
      setStep(0);
    },
    onError: (e) => toast("error", `Errore TH: ${e.message}`),
  });

  const preview = useCostPreview();

  const update = (ax: Axis, patch: Partial<AxisCfg>) =>
    setAxes((s) => ({ ...s, [ax]: { ...s[ax], ...patch } }));

  const canProceed = useMemo(() => {
    if (step === 0) return activeAxes.length > 0;
    if (step === 1) {
      return activeAxes.every((ax) => {
        const cfg = axes[ax];
        if (cfg.source === "catalog") return !!cfg.filename;
        if (cfg.source === "synthetic") return !!cfg.duration && !!cfg.pga;
        return true;
      });
    }
    return dt > 0 && tEnd > 0;
  }, [step, activeAxes, axes, dt, tEnd]);

  async function buildSolveParams() {
    if (!model) throw new Error("Nessun modello attivo");
    if (activeAxes.length === 0) throw new Error("Attiva almeno una componente");
    const components: Record<string, [number, number][]> = {};
    for (const ax of activeAxes) {
      const cfg = axes[ax];
      if (cfg.source === "catalog") {
        if (!cfg.filename) throw new Error(`Seleziona un accelerogramma per ${ax}`);
        const data = await accelerogramsApi.get(cfg.filename);
        components[ax] = data.time_history;
      } else if (cfg.source === "synthetic") {
        const data = await accelerogramsApi.synthetic({
          algorithm: cfg.algorithm ?? "kanai_tajimi",
          duration: cfg.duration ?? 20,
          dt: cfg.dt ?? 0.01,
          pga_target: cfg.pga ?? 3.5,
          seed: cfg.seed,
        });
        components[ax] = data.time_history;
      }
    }
    return { components, dt, t_end: tEnd, damping_xi: xi, omega_lo_hz: omegaLo, omega_hi_hz: omegaHi };
  }

  const handleSubmit = () => {
    if (!model) {
      toast("error", "Nessun modello attivo");
      return;
    }
    const dummyComponents: Record<string, unknown> = {};
    activeAxes.forEach((a) => { dummyComponents[a] = []; });
    preview.previewAndRun(
      { model_id: model.id, solver: "seismic_th",
        params: { dt, t_end: tEnd, components: dummyComponents } },
      async () => {
        try {
          const params = await buildSolveParams();
          await job.mutate({ model_id: model.id, solver: "seismic_th", params });
        } catch (e) {
          toast("error", `Errore preparazione TH: ${(e as Error).message}`);
        }
      },
    );
  };

  return (
    <>
      <WizardShell
        open={open}
        title="Sismica time-history"
        breadcrumb={[
          { label: "Sismica", icon: Zap },
          { label: "Time-history", icon: Activity },
        ]}
        steps={[
          { id: "directions",     label: "Direzioni" },
          { id: "accelerograms",  label: "Accelerogrammi" },
          { id: "params",         label: "Parametri" },
        ]}
        currentStep={step}
        onClose={() => { onClose(); setStep(0); }}
        onBack={step > 0 ? () => setStep((s) => s - 1) : undefined}
        onNext={() => setStep((s) => s + 1)}
        onSubmit={handleSubmit}
        canProceed={canProceed}
        isSubmitting={job.isPending}
        submitLabel="Esegui TH"
      >
        {step === 0 && <DirectionsStep axes={axes} update={update} />}
        {step === 1 && (
          <AccelerogramsStep
            axes={axes} activeAxes={activeAxes} catalog={catalog} update={update}
          />
        )}
        {step === 2 && (
          <ParametersStep
            activeAxes={activeAxes}
            dt={dt} setDt={setDt}
            tEnd={tEnd} setTEnd={setTEnd}
            xi={xi} setXi={setXi}
            omegaLo={omegaLo} setOmegaLo={setOmegaLo}
            omegaHi={omegaHi} setOmegaHi={setOmegaHi}
            advanced={advanced} setAdvanced={setAdvanced}
          />
        )}
      </WizardShell>
      <CostPreviewDialog
        open={preview.open}
        estimate={preview.estimate}
        quota={preview.quota}
        isLoading={preview.isLoading}
        onConfirm={preview.confirm}
        onCancel={preview.cancel}
      />
    </>
  );
}


// ── Step 1: Direzioni ──────────────────────────────────────────────────────
function DirectionsStep({
  axes, update,
}: {
  axes: Record<Axis, AxisCfg>;
  update: (ax: Axis, patch: Partial<AxisCfg>) => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-[12px] text-ink-3 leading-relaxed">
        Scegli quali componenti sismiche applicare al modello. Per la
        progettazione standard si usano <span className="font-semibold text-ink">X + Y</span>
        (orizzontali ortogonali); Z e' richiesta solo per strutture sensibili
        al sussulto verticale (NTC §7.2.3).
      </p>
      <div className="space-y-2">
        {(["X", "Y", "Z"] as Axis[]).map((ax) => {
          const active = axes[ax].source !== "off";
          return (
            <label
              key={ax}
              className={`flex items-center gap-3 p-3 rounded-md border cursor-pointer transition ${
                active ? "border-accent/40 bg-bg-info" : "border-border bg-bg-panel hover:bg-bg-hover"
              }`}
            >
              <input
                type="checkbox"
                checked={active}
                onChange={(e) =>
                  update(ax, { source: e.target.checked ? "catalog" : "off" })
                }
                className="w-3.5 h-3.5 accent-accent"
                data-testid={`wiz-dir-${ax}`}
              />
              <div className="flex-1">
                <div className="text-sm font-semibold text-ink">Direzione {ax}</div>
                <div className="text-[11px] text-ink-3">
                  {ax === "X" && "Orizzontale primaria (longitudinale strutturale)"}
                  {ax === "Y" && "Orizzontale secondaria (trasversale strutturale)"}
                  {ax === "Z" && "Verticale (zone alta sismicità o strutture sensibili)"}
                </div>
              </div>
              {active && (
                <span className="text-[10px] font-mono text-ink-info bg-bg-info border border-accent/30 px-1.5 py-0.5 rounded-sm">
                  ATTIVA
                </span>
              )}
            </label>
          );
        })}
      </div>
    </div>
  );
}


// ── Step 2: Accelerogrammi ────────────────────────────────────────────────
function AccelerogramsStep({
  axes, activeAxes, catalog, update,
}: {
  axes: Record<Axis, AxisCfg>;
  activeAxes: Axis[];
  catalog: { filename: string; name: string; pga_m_s2: number }[] | undefined;
  update: (ax: Axis, patch: Partial<AxisCfg>) => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-[12px] text-ink-3 leading-relaxed">
        Per ogni direzione attiva scegli un accelerogramma dal catalogo
        (eventi storici registrati) o genera un segnale sintetico stazionario.
      </p>
      {activeAxes.map((ax) => {
        const cfg = axes[ax];
        return (
          <div key={ax} className="border border-border rounded-md p-3 bg-bg-panel">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-sm font-semibold text-ink">Direzione {ax}</span>
              <select
                value={cfg.source}
                onChange={(e) => update(ax, { source: e.target.value as Source })}
                className="h-7 text-[11px] px-2 rounded bg-bg-elevated border border-border text-ink"
              >
                <option value="catalog">Catalogo</option>
                <option value="synthetic">Sintetico</option>
              </select>
            </div>

            {cfg.source === "catalog" && (
              <select
                value={cfg.filename ?? ""}
                onChange={(e) => update(ax, { filename: e.target.value })}
                className="w-full h-7 text-[11px] px-2 rounded bg-bg-elevated border border-border text-ink"
                data-testid={`wiz-acc-${ax}-file`}
              >
                <option value="">— scegli accelerogramma —</option>
                {catalog?.map((a) => (
                  <option key={a.filename} value={a.filename}>
                    {a.name} (PGA {a.pga_m_s2.toFixed(2)} m/s²)
                  </option>
                ))}
              </select>
            )}

            {cfg.source === "synthetic" && (
              <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                <label>
                  <div className="text-[10px] text-ink-3 mb-0.5">Algoritmo</div>
                  <select
                    value={cfg.algorithm ?? "kanai_tajimi"}
                    onChange={(e) => update(ax, { algorithm: e.target.value as "kanai_tajimi" | "boore" })}
                    className="w-full h-7 px-1.5 rounded bg-bg-elevated border border-border text-ink"
                  >
                    <option value="kanai_tajimi">Kanai-Tajimi</option>
                    <option value="boore">Boore</option>
                  </select>
                </label>
                <label>
                  <div className="text-[10px] text-ink-3 mb-0.5">Seed</div>
                  <input
                    type="number"
                    value={cfg.seed ?? ""}
                    onChange={(e) => update(ax, { seed: Number(e.target.value) || undefined })}
                    className="w-full h-7 px-1.5 rounded bg-bg-elevated border border-border text-ink font-mono"
                    placeholder="42"
                  />
                </label>
                <label>
                  <div className="text-[10px] text-ink-3 mb-0.5">Durata [s]</div>
                  <input
                    type="number"
                    value={cfg.duration ?? ""}
                    onChange={(e) => update(ax, { duration: Number(e.target.value) || undefined })}
                    className="w-full h-7 px-1.5 rounded bg-bg-elevated border border-border text-ink font-mono"
                  />
                </label>
                <label>
                  <div className="text-[10px] text-ink-3 mb-0.5">PGA [m/s²]</div>
                  <input
                    type="number"
                    step="0.1"
                    value={cfg.pga ?? ""}
                    onChange={(e) => update(ax, { pga: Number(e.target.value) || undefined })}
                    className="w-full h-7 px-1.5 rounded bg-bg-elevated border border-border text-ink font-mono"
                  />
                </label>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}


// ── Step 3: Parametri ─────────────────────────────────────────────────────
function ParametersStep({
  activeAxes, dt, setDt, tEnd, setTEnd, xi, setXi,
  omegaLo, setOmegaLo, omegaHi, setOmegaHi, advanced, setAdvanced,
}: {
  activeAxes: Axis[];
  dt: number; setDt: (v: number) => void;
  tEnd: number; setTEnd: (v: number) => void;
  xi: number; setXi: (v: number) => void;
  omegaLo: number; setOmegaLo: (v: number) => void;
  omegaHi: number; setOmegaHi: (v: number) => void;
  advanced: boolean; setAdvanced: (v: boolean) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="bg-bg-info border border-accent/20 rounded-md p-3">
        <div className="text-[11px] font-semibold text-ink-info mb-1">Riepilogo</div>
        <div className="text-[11px] text-ink-3">
          {activeAxes.length} componente/i attiva/e: {activeAxes.join(", ")}.
          Solver Newmark-β su modello 3D con smorzamento Rayleigh.
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <NumberField label="dt [s]" hint="Passo Newmark" value={dt} onChange={setDt} step={0.001} min={1e-4} max={1} />
        <NumberField label="t_end [s]" hint="Durata simulazione" value={tEnd} onChange={setTEnd} step={1} min={0.1} max={1000} />
      </div>

      <button
        type="button"
        onClick={() => setAdvanced(!advanced)}
        className="w-full flex items-center gap-1.5 text-[11px] font-semibold text-ink-3 hover:text-ink transition py-1.5"
      >
        {advanced ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        Parametri avanzati (smorzamento Rayleigh)
      </button>
      {advanced && (
        <div className="grid grid-cols-2 gap-3 border border-border rounded-md p-3 bg-bg-panel">
          <NumberField label="ξ damping" hint="Modale (0-0.5)" value={xi} onChange={setXi} step={0.01} min={0} max={0.5} />
          <div />
          <NumberField label="ω_lo [Hz]" hint="Rayleigh ancoraggio basso" value={omegaLo} onChange={setOmegaLo} step={0.1} min={0.01} />
          <NumberField label="ω_hi [Hz]" hint="Rayleigh ancoraggio alto" value={omegaHi} onChange={setOmegaHi} step={0.1} min={0.01} />
        </div>
      )}
    </div>
  );
}


function NumberField({
  label, hint, value, onChange, step, min, max,
}: {
  label: string;
  hint?: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
}) {
  return (
    <label className="block">
      <div className="text-[10px] text-ink-3 mb-0.5 font-mono uppercase tracking-wider">{label}</div>
      <input
        type="number"
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          if (!Number.isNaN(v)) onChange(v);
        }}
        step={step}
        min={min}
        max={max}
        className="w-full h-8 px-2 rounded bg-bg-elevated border border-border text-ink font-mono text-sm focus:outline-none focus:border-accent/60"
      />
      {hint && <div className="text-[10px] text-ink-3 mt-0.5">{hint}</div>}
    </label>
  );
}
