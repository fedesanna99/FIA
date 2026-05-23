/**
 * ApplyClimateLoadsDialog (Precision v2.0 PR17 T8) — climate loads Precision.
 *
 * Applica i loads del ClimateBundle al modello. Wind direction, tributary
 * area (uniform/per-node), skip vincolati, preview counts. Hairline borders,
 * no emoji, mono labels.
 */
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Wand2, Calculator } from "lucide-react";

import { Dialog } from "./Dialog";
import { Button } from "../ui/Button";
import { toast } from "../../store/toastStore";
import { useClimateStore } from "../../store/climateStore";
import { useModelStore } from "../../store/modelStore";
import { modelsApi } from "../../api/client";
import {
  applyClimateLoadsToModel,
  DEFAULT_APPLY_OPTIONS,
  type WindDirection,
  type TributaryMode,
} from "../../lib/applyClimateLoads";
import { computeTributaryAreas } from "../../lib/tributaryAreas";


interface Props {
  open: boolean;
  onClose: () => void;
}

const fieldLabel = "block font-mono text-[10px] uppercase tracking-wide-1 text-ink-3 mb-1.5";
const inputCls = "w-full px-2.5 py-1.5 text-sm bg-bg-elevated border border-border-light text-ink focus:border-accent focus:outline-none transition-colors";
const numInputCls = `${inputCls} font-mono tabular-nums`;


export function ApplyClimateLoadsDialog({ open, onClose }: Props) {
  const bundle = useClimateStore((s) => s.bundle);
  const model = useModelStore((s) => s.model);
  const qc = useQueryClient();

  const [includeWind, setIncludeWind] = useState(DEFAULT_APPLY_OPTIONS.includeWind);
  const [includeSnow, setIncludeSnow] = useState(DEFAULT_APPLY_OPTIONS.includeSnow);
  const [includeSeismic, setIncludeSeismic] = useState(DEFAULT_APPLY_OPTIONS.includeSeismic);
  const [windDirection, setWindDirection] = useState<WindDirection>(
    DEFAULT_APPLY_OPTIONS.windDirection,
  );
  const [windEnvelope, setWindEnvelope] = useState(DEFAULT_APPLY_OPTIONS.windEnvelope);
  const [windEnvelope4Direction, setWindEnvelope4Direction] = useState(
    DEFAULT_APPLY_OPTIONS.windEnvelope4Direction,
  );
  const [tributaryMode, setTributaryMode] = useState<TributaryMode>(
    DEFAULT_APPLY_OPTIONS.tributaryMode,
  );
  const [tributaryArea, setTributaryArea] = useState(
    DEFAULT_APPLY_OPTIONS.tributaryArea,
  );
  const [facadeWidthM, setFacadeWidthM] = useState(
    DEFAULT_APPLY_OPTIONS.facadeWidthM,
  );
  const [skipConstrained, setSkipConstrained] = useState(
    DEFAULT_APPLY_OPTIONS.skipConstrained,
  );

  const preview = useMemo(() => {
    if (!bundle || !model) return null;
    return applyClimateLoadsToModel(model, bundle, {
      includeWind, includeSnow, includeSeismic,
      windDirection, windEnvelope, windEnvelope4Direction,
      tributaryMode, tributaryArea, facadeWidthM,
      skipConstrained,
    });
  }, [
    bundle, model, includeWind, includeSnow, includeSeismic,
    windDirection, windEnvelope, windEnvelope4Direction,
    tributaryMode, tributaryArea, facadeWidthM, skipConstrained,
  ]);

  const apply = useMutation({
    mutationFn: async () => {
      if (!model || !bundle || !preview) return;
      let nAdded = 0;
      for (const load of preview.loads) {
        try {
          await modelsApi.addLoad(model.id, { ...load, id: 0 } as never);
          nAdded++;
        } catch {
          // log ma continua
        }
      }
      return nAdded;
    },
    onSuccess: (nAdded) => {
      qc.invalidateQueries({ queryKey: ["model"] });
      qc.invalidateQueries({ queryKey: ["models"] });
      toast(
        "success",
        `${nAdded} carichi applicati al modello da ${bundle?.location.name}`,
      );
      onClose();
    },
    onError: (e) => toast("error", `Errore applicazione: ${(e as Error).message}`),
  });

  if (!bundle || !model) {
    return (
      <Dialog open={open} onClose={onClose} title="Applica climate loads" width={480}>
        <div className="text-sm text-ink-2 px-3 py-4 bg-bg-panel border border-border">
          {!bundle
            ? "Nessun climate context attivo. Usa prima TopBar → Loads."
            : "Nessun modello attivo. Carica un modello prima di applicare i carichi."}
        </div>
      </Dialog>
    );
  }

  const canApply = preview != null && preview.loads.length > 0 && !apply.isPending;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Climate loads · ${bundle.location.name}`}
      width={520}
    >
      <div className="space-y-4" data-testid="apply-climate-dialog">
        {/* Source values (read-only) */}
        <div className="bg-bg-elevated border border-border p-3">
          <div className="font-mono text-[10px] uppercase tracking-wide-2 text-ink-3 font-semibold mb-1.5">
            Valori sorgente · EN 1991
          </div>
          <div className="font-mono text-[12px] space-x-3">
            <span className="text-ink-3">q_p(z=10m)</span>
            <span className="text-accent font-semibold">
              {bundle.meteo?.wind.q_p_z10_kN_m2.toFixed(3)} kN/m²
            </span>
            <span className="text-ink-3">·</span>
            <span className="text-ink-3">s_design</span>
            <span className="text-accent font-semibold">
              {bundle.meteo?.snow.s_design_kN_m2.toFixed(3)} kN/m²
            </span>
          </div>
        </div>

        {/* Wind */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 select-none cursor-pointer">
            <input
              type="checkbox"
              checked={includeWind}
              onChange={(e) => setIncludeWind(e.target.checked)}
              data-testid="apply-include-wind"
              className="w-3.5 h-3.5 border border-border-light accent-accent"
            />
            <span className="font-display text-base font-semibold tracking-tight-1 text-ink">Vento · q_p</span>
          </label>
          {includeWind && (
            <div className="pl-5 space-y-2 border-l border-border ml-1.5 py-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-wide-1 text-ink-3">Direzione:</span>
                <select
                  className="text-sm bg-bg-elevated border border-border-light text-ink px-2 py-1 focus:border-accent focus:outline-none disabled:bg-bg-hover disabled:text-ink-3"
                  value={windDirection}
                  onChange={(e) => setWindDirection(e.target.value as WindDirection)}
                  disabled={windEnvelope || windEnvelope4Direction}
                  data-testid="apply-wind-direction"
                >
                  <option value="+X">+X · est</option>
                  <option value="-X">-X · ovest</option>
                  <option value="+Y">+Y · nord</option>
                  <option value="-Y">-Y · sud</option>
                </select>
              </div>
              <label className="flex items-center gap-1.5 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={windEnvelope && !windEnvelope4Direction}
                  onChange={(e) => {
                    setWindEnvelope(e.target.checked);
                    if (e.target.checked) setWindEnvelope4Direction(false);
                  }}
                  data-testid="apply-wind-envelope"
                  className="w-3.5 h-3.5 border border-border-light accent-accent"
                />
                <span className="text-ink-2">Inviluppo bidirezionale (±{windDirection.replace(/[+-]/, "")})</span>
                <span className="font-mono text-[10px] text-ink-3">· 2 loads/nodo</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={windEnvelope4Direction}
                  onChange={(e) => {
                    setWindEnvelope4Direction(e.target.checked);
                    if (e.target.checked) setWindEnvelope(false);
                  }}
                  data-testid="apply-wind-envelope-4d"
                  className="w-3.5 h-3.5 border border-border-light accent-accent"
                />
                <span className="text-accent font-medium">Inviluppo 4 direzioni · ±X ±Y</span>
                <span className="font-mono text-[10px] text-ink-3">· 4 loads/nodo NTC §3.3.3</span>
              </label>
            </div>
          )}
        </div>

        {/* Snow */}
        <label className="flex items-center gap-2 select-none cursor-pointer">
          <input
            type="checkbox"
            checked={includeSnow}
            onChange={(e) => setIncludeSnow(e.target.checked)}
            data-testid="apply-include-snow"
            className="w-3.5 h-3.5 border border-border-light accent-accent"
          />
          <span className="font-display text-base font-semibold tracking-tight-1 text-ink">
            Neve · s_design verso -Z
          </span>
        </label>

        {/* Seismic */}
        {bundle.seismic && (
          <div>
            <label className="flex items-center gap-2 select-none cursor-pointer">
              <input
                type="checkbox"
                checked={includeSeismic}
                onChange={(e) => setIncludeSeismic(e.target.checked)}
                data-testid="apply-include-seismic"
                className="w-3.5 h-3.5 border border-border-light accent-accent"
              />
              <span className="font-display text-base font-semibold tracking-tight-1 text-ink">
                Sismica · ground_accel +X
              </span>
            </label>
            {includeSeismic && (
              <div className="pl-5 mt-1 font-mono text-[10px] text-ink-3">
                a_g = a_g/g · g = {(bundle.seismic.site_params.a_g_over_g * 9.81).toFixed(3)} m/s²
                · 1 load model-level · NTC §7.3.3
              </div>
            )}
          </div>
        )}

        {/* Tributary mode */}
        <div className="space-y-2 border-t border-border pt-3">
          <div className={fieldLabel}>Modalità area di influenza</div>
          <div className="flex items-center gap-4 text-sm">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="tributary-mode"
                value="uniform"
                checked={tributaryMode === "uniform"}
                onChange={() => setTributaryMode("uniform")}
                data-testid="apply-mode-uniform"
                className="accent-accent"
              />
              <span className="text-ink-2">Uniforme</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="tributary-mode"
                value="per-node"
                checked={tributaryMode === "per-node"}
                onChange={() => setTributaryMode("per-node")}
                data-testid="apply-mode-per-node"
                className="accent-accent"
              />
              <span className="text-ink-2">Per-nodo da topologia</span>
            </label>
          </div>

          {tributaryMode === "uniform" && (
            <div className="space-y-2 pl-3 border-l border-border ml-0.5 py-1">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[10px] uppercase tracking-wide-1 text-ink-3">
                  Area uniforme per nodo [m²]
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const r = computeTributaryAreas(model);
                    if (r.stats.n_nodes_with_tributary === 0) {
                      toast("error", "Topologia priva di beam/shell: impossibile derivare aree.");
                      return;
                    }
                    setTributaryArea(Math.round(r.stats.area_mean_m2 * 1000) / 1000);
                    toast(
                      "info",
                      `Auto-calc: media ${r.stats.area_mean_m2.toFixed(3)} m² ` +
                      `(range ${r.stats.area_min_m2.toFixed(3)}–${r.stats.area_max_m2.toFixed(3)})`,
                    );
                  }}
                  data-testid="apply-auto-tributary"
                  className="inline-flex items-center gap-1 text-[11px] text-accent hover:underline"
                >
                  <Calculator className="w-3 h-3" />
                  Auto media
                </button>
              </div>
              <input
                type="number"
                min={0.01}
                max={1000}
                step={0.1}
                value={tributaryArea}
                onChange={(e) => setTributaryArea(Number(e.target.value) || 1.0)}
                className={`${numInputCls} w-36`}
                data-testid="apply-tributary-area"
              />
              <div className="font-mono text-[11px] text-ink-3 leading-snug">
                wind = q_p × {tributaryArea.toFixed(2)} ={" "}
                <strong className="text-ink">
                  {((bundle.meteo?.wind.q_p_z10_kN_m2 ?? 0) * tributaryArea).toFixed(3)} kN
                </strong>
                {" "}/nodo uniforme
              </div>
            </div>
          )}

          {tributaryMode === "per-node" && (
            <div className="space-y-2 pl-3 border-l border-accent/40 ml-0.5 py-1">
              <span className="font-mono text-[10px] uppercase tracking-wide-1 text-ink-3">
                Larghezza facciata per beam 1D [m]
              </span>
              <input
                type="number"
                min={0.1}
                max={100}
                step={0.1}
                value={facadeWidthM}
                onChange={(e) => setFacadeWidthM(Number(e.target.value) || 1.0)}
                className={`${numInputCls} w-36`}
                data-testid="apply-facade-width"
              />
              <div className="text-[11px] text-ink-3 leading-snug">
                Ogni nodo riceve q × tributary[i] specifico dalla topologia · beam: ½ lunghezze
                adiacenti × {facadeWidthM.toFixed(1)} m · shell: ¼ aree Q4 / ⅓ aree Tri3.
              </div>
            </div>
          )}
        </div>

        {/* Skip constrained */}
        <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
          <input
            type="checkbox"
            checked={skipConstrained}
            onChange={(e) => setSkipConstrained(e.target.checked)}
            data-testid="apply-skip-constrained"
            className="w-3.5 h-3.5 border border-border-light accent-accent"
          />
          <span className="text-ink-2">Salta nodi vincolati <span className="font-mono text-[10px] text-ink-3">· raccomandato</span></span>
        </label>

        {/* Preview */}
        {preview && (
          <div
            className="bg-accent-subtle/40 border border-accent/30 p-3 space-y-1"
            data-testid="apply-preview"
          >
            <div className="font-mono text-[10px] uppercase tracking-wide-2 text-accent font-semibold mb-1">
              <Wand2 className="inline w-3 h-3 mr-1" />
              Anteprima
            </div>
            <div className="text-sm text-ink">
              Carichi da aggiungere: <strong>{preview.loads.length}</strong>
              <span className="text-ink-3"> · {preview.n_nodes_loaded} nodi</span>
            </div>
            {preview.n_nodes_skipped > 0 && (
              <div className="text-[11px] text-ink-3">
                {preview.n_nodes_skipped} nodi saltati ({tributaryMode === "per-node" ? "vincolati o isolati" : "vincolati"})
              </div>
            )}
            {preview.wind_force_kN > 0 && (
              <div className="font-mono text-[11px] text-ink-2">
                Wind force/nodo:{" "}
                {preview.wind_force_min_kN !== undefined && preview.wind_force_max_kN !== undefined
                  ? (
                    <>
                      <strong className="text-ink">{preview.wind_force_min_kN.toFixed(3)}–{preview.wind_force_max_kN.toFixed(3)} kN</strong>
                      <span className="text-ink-3"> · media {preview.wind_force_kN.toFixed(3)}</span>
                    </>
                  ) : (
                    <strong className="text-ink">{preview.wind_force_kN.toFixed(3)} kN</strong>
                  )
                }
              </div>
            )}
            {preview.snow_force_kN > 0 && (
              <div className="font-mono text-[11px] text-ink-2">
                Snow force/nodo:{" "}
                {preview.snow_force_min_kN !== undefined && preview.snow_force_max_kN !== undefined
                  ? (
                    <>
                      <strong className="text-ink">{preview.snow_force_min_kN.toFixed(3)}–{preview.snow_force_max_kN.toFixed(3)} kN</strong>
                      <span className="text-ink-3"> · media {preview.snow_force_kN.toFixed(3)}</span>
                    </>
                  ) : (
                    <strong className="text-ink">{preview.snow_force_kN.toFixed(3)} kN</strong>
                  )
                }
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
          <Button size="sm" variant="ghost" onClick={onClose}>
            Annulla
          </Button>
          <Button
            size="sm"
            variant="primary"
            disabled={!canApply}
            loading={apply.isPending}
            onClick={() => apply.mutate()}
            data-testid="apply-submit"
          >
            Aggiungi {preview?.loads.length ?? 0} carichi al modello
          </Button>
        </div>

        <div className="text-[10px] text-ink-3 italic leading-snug">
          {tributaryMode === "per-node"
            ? "NB v1.4 alpha: facade_width uniforme per beam 1D. Per accuratezza totale serve definire h(z) per ogni nodo verticale."
            : "NB v1.4 alpha: tributary area uniforme = stima preliminare. Usa modalità per-nodo per accuracy scientifica."}
        </div>
      </div>
    </Dialog>
  );
}
