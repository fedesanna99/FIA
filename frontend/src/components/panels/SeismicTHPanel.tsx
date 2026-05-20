/**
 * SeismicTHPanel — sismica time-history multi-componente (FASE 12).
 *
 * UX:
 *  1. Per ciascuna componente X/Y/Z, scegli da catalogo / sintetico / disattiva.
 *  2. Imposta dt, t_end, damping, Rayleigh ω_lo/ω_hi.
 *  3. Esegui → DynamicResults (visualizzabile poi nel workspace Risultati).
 */
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Play } from "lucide-react";
import { useModelStore } from "../../store/modelStore";
import { accelerogramsApi } from "../../api/io";
import { toast } from "../../store/toastStore";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Field, NumericInput } from "../ui/Input";
import { Badge } from "../ui/Badge";
import { useCostPreview } from "../../hooks/useCostPreview";
import { useJobRun } from "../../hooks/useJobRun";
import { CostPreviewDialog } from "../dialogs/billing/CostPreviewDialog";

type Axis = "X" | "Y" | "Z";
type Source = "off" | "catalog" | "synthetic";

interface AxisCfg {
  source: Source;
  /** filename del catalogo accelerogrammi (source=catalog) */
  filename?: string;
  /** sintetico (source=synthetic) */
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

export function SeismicTHPanel() {
  const model = useModelStore((s) => s.model);
  const [axes, setAxes] = useState<Record<Axis, AxisCfg>>({
    X: { ...DEFAULT_AXIS, source: "catalog" },
    Y: { ...DEFAULT_AXIS },
    Z: { ...DEFAULT_AXIS },
  });

  const [dt, setDt] = useState(0.01);
  const [tEnd, setTEnd] = useState(20);
  const [xi, setXi] = useState(0.05);
  const [omegaLo, setOmegaLo] = useState(0.5);
  const [omegaHi, setOmegaHi] = useState(10.0);

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
      toast("success", "Sismica time-history completata — apri il workspace Risultati");
    },
    onError: (e) => toast("error", `Errore TH: ${e.message}`),
  });

  const update = (ax: Axis, patch: Partial<AxisCfg>) =>
    setAxes((s) => ({ ...s, [ax]: { ...s[ax], ...patch } }));

  const preview = useCostPreview();

  /** Carica accelerogrammi e ritorna i params completi del solve seismic_th. */
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
    return {
      components,
      dt, t_end: tEnd,
      damping_xi: xi,
      omega_lo_hz: omegaLo,
      omega_hi_hz: omegaHi,
    };
  }

  const handleSolve = () => {
    if (!model) {
      toast("error", "Nessun modello attivo");
      return;
    }
    // Per il cost estimate basta un dict di n componenti (il backend conta solo le chiavi).
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
    <div className="p-3 space-y-3">
      <Card
        title="Sismica time-history multi-componente (NTC §3.2.3.6)"
        description="Newmark-β su modello 3D con uno o più accelerogrammi GROUND_ACCEL ortogonali. Smorzamento Rayleigh tra due frequenze."
      >
        <div className="space-y-2">
          {(["X", "Y", "Z"] as Axis[]).map((ax) => (
            <AxisRow key={ax} axis={ax} cfg={axes[ax]} catalog={catalog} onChange={(p) => update(ax, p)} />
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-border">
          <Field label="dt [s]" hint="Passo Newmark">
            <NumericInput value={dt} onChange={setDt} step={0.001} min={1e-4} max={1} />
          </Field>
          <Field label="t_end [s]" hint="Durata simulazione">
            <NumericInput value={tEnd} onChange={setTEnd} step={1} min={0.1} max={1000} />
          </Field>
          <Field label="ξ damping" hint="Smorzamento modale">
            <NumericInput value={xi} onChange={setXi} step={0.01} min={0} max={0.5} />
          </Field>
          <Field label="" hint="Rayleigh damping anchors">
            <div className="grid grid-cols-2 gap-1">
              <NumericInput value={omegaLo} onChange={setOmegaLo} step={0.1} min={0.01} unit="Hz lo" />
              <NumericInput value={omegaHi} onChange={setOmegaHi} step={0.1} min={0.01} unit="Hz hi" />
            </div>
          </Field>
        </div>

        <div className="flex items-center gap-2 mt-3">
          <Button
            variant="primary" size="sm"
            iconLeft={<Play className="h-3.5 w-3.5" />}
            disabled={!model || job.isPending || activeAxes.length === 0}
            loading={job.isPending}
            onClick={handleSolve}
          >
            {job.isPending ? "In esecuzione…" : "Esegui TH"}
          </Button>
          {activeAxes.length > 0 && (
            <Badge size="sm" variant="info">{activeAxes.length} componente/i attiva/e</Badge>
          )}
        </div>
      </Card>
      <CostPreviewDialog
        open={preview.open}
        estimate={preview.estimate}
        quota={preview.quota}
        isLoading={preview.isLoading}
        onConfirm={preview.confirm}
        onCancel={preview.cancel}
      />
    </div>
  );
}

function AxisRow({ axis, cfg, catalog, onChange }: {
  axis: Axis;
  cfg: AxisCfg;
  catalog: { filename: string; name: string; pga_m_s2: number }[] | undefined;
  onChange: (p: Partial<AxisCfg>) => void;
}) {
  return (
    <div className="border border-border rounded p-2 bg-bg/40">
      <div className="flex items-center gap-2 mb-1.5">
        <Badge size="sm" variant={cfg.source === "off" ? "muted" : "accent"}>
          Asse {axis}
        </Badge>
        <select
          className="h-7 text-xs px-2 rounded bg-bg-elevated border border-border text-ink flex-1"
          value={cfg.source}
          onChange={(e) => onChange({ source: e.target.value as Source })}
        >
          <option value="off">Disattivato</option>
          <option value="catalog">Catalogo</option>
          <option value="synthetic">Sintetico</option>
        </select>
      </div>

      {cfg.source === "catalog" && (
        <select
          className="w-full h-7 text-xs px-2 rounded bg-bg-elevated border border-border text-ink"
          value={cfg.filename ?? ""}
          onChange={(e) => onChange({ filename: e.target.value })}
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
        <div className="grid grid-cols-2 gap-1.5 mt-1 text-[10px]">
          <select className="h-6 text-[10px] px-1 rounded bg-bg-elevated border border-border text-ink"
                  value={cfg.algorithm ?? "kanai_tajimi"}
                  onChange={(e) => onChange({ algorithm: e.target.value as "kanai_tajimi" | "boore" })}>
            <option value="kanai_tajimi">Kanai-Tajimi</option>
            <option value="boore">Boore</option>
          </select>
          <input className="h-6 text-[10px] px-1 rounded bg-bg-elevated border border-border text-ink text-center"
                 placeholder="seed" value={cfg.seed ?? ""}
                 onChange={(e) => onChange({ seed: Number(e.target.value) || undefined })} />
          <input className="h-6 text-[10px] px-1 rounded bg-bg-elevated border border-border text-ink text-center"
                 placeholder="durata [s]" value={cfg.duration ?? ""}
                 onChange={(e) => onChange({ duration: Number(e.target.value) || undefined })} />
          <input className="h-6 text-[10px] px-1 rounded bg-bg-elevated border border-border text-ink text-center"
                 placeholder="PGA [m/s²]" value={cfg.pga ?? ""}
                 onChange={(e) => onChange({ pga: Number(e.target.value) || undefined })} />
        </div>
      )}
    </div>
  );
}
