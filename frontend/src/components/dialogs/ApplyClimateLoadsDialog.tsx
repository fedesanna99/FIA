/**
 * ApplyClimateLoadsDialog — applica i loads del ClimateBundle al modello attivo.
 *
 * UX: l'utente sceglie wind/snow/entrambi, direzione vento, tributary area,
 * skip nodi vincolati. Preview count nodi caricabili. Click Applica:
 * crea N Load entries via modelsApi.addLoad in loop + invalidate query +
 * toast.
 */
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

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
} from "../../lib/applyClimateLoads";
import { computeTributaryAreas } from "../../lib/tributaryAreas";


interface Props {
  open: boolean;
  onClose: () => void;
}


export function ApplyClimateLoadsDialog({ open, onClose }: Props) {
  const bundle = useClimateStore((s) => s.bundle);
  const model = useModelStore((s) => s.model);
  const qc = useQueryClient();

  const [includeWind, setIncludeWind] = useState(DEFAULT_APPLY_OPTIONS.includeWind);
  const [includeSnow, setIncludeSnow] = useState(DEFAULT_APPLY_OPTIONS.includeSnow);
  const [windDirection, setWindDirection] = useState<WindDirection>(
    DEFAULT_APPLY_OPTIONS.windDirection,
  );
  const [tributaryArea, setTributaryArea] = useState(
    DEFAULT_APPLY_OPTIONS.tributaryArea,
  );
  const [skipConstrained, setSkipConstrained] = useState(
    DEFAULT_APPLY_OPTIONS.skipConstrained,
  );

  // Preview: calcola loads (pure) per mostrare counts senza side effect.
  const preview = useMemo(() => {
    if (!bundle || !model) return null;
    return applyClimateLoadsToModel(model, bundle, {
      includeWind, includeSnow, windDirection, tributaryArea, skipConstrained,
    });
  }, [bundle, model, includeWind, includeSnow, windDirection, tributaryArea, skipConstrained]);

  const apply = useMutation({
    mutationFn: async () => {
      if (!model || !bundle || !preview) return;
      // Itera e chiama API addLoad per ciascun carico
      let nAdded = 0;
      for (const load of preview.loads) {
        try {
          // L'API richiede full Load including id, lo mandiamo con id=0
          // (backend lo riassegna su create).
          await modelsApi.addLoad(model.id, { ...load, id: 0 } as never);
          nAdded++;
        } catch (e) {
          // log ma continua: errore puntuale non blocca il batch
          // (tipicamente API gestisce 1-a-1)
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
      <Dialog open={open} onClose={onClose} title="Applica climate loads" width={460}>
        <div className="p-4 text-sm text-ink-dim">
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
      title={`🔧 Applica climate loads — ${bundle.location.name}`}
      width={480}
    >
      <div className="px-4 py-3 space-y-4 text-sm" data-testid="apply-climate-dialog">
        {/* Source values (read-only) */}
        <div className="bg-bg-elevated border border-border rounded p-2 text-xs">
          <div className="font-semibold text-ink-dim mb-1">Valori sorgente (EN 1991)</div>
          <div className="font-mono">
            q_p(z=10m) = <span className="text-accent">{bundle.meteo?.wind.q_p_z10_kN_m2.toFixed(3)} kN/m²</span>
            {"   "}
            s_design = <span className="text-accent">{bundle.meteo?.snow.s_design_kN_m2.toFixed(3)} kN/m²</span>
          </div>
        </div>

        {/* Wind */}
        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={includeWind}
              onChange={(e) => setIncludeWind(e.target.checked)}
              data-testid="apply-include-wind"
            />
            <span className="font-semibold">🌬️ Vento (q_p)</span>
          </label>
          {includeWind && (
            <div className="pl-6 flex items-center gap-2 text-xs">
              <span className="text-ink-dim">Direzione:</span>
              <select
                className="bg-bg-elevated border border-border rounded px-2 py-1"
                value={windDirection}
                onChange={(e) => setWindDirection(e.target.value as WindDirection)}
                data-testid="apply-wind-direction"
              >
                <option value="+X">+X (est →)</option>
                <option value="-X">-X (ovest ←)</option>
                <option value="+Y">+Y (nord ↑)</option>
                <option value="-Y">-Y (sud ↓)</option>
              </select>
            </div>
          )}
        </div>

        {/* Snow */}
        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={includeSnow}
              onChange={(e) => setIncludeSnow(e.target.checked)}
              data-testid="apply-include-snow"
            />
            <span className="font-semibold">❄️ Neve (s_design, verso -Z)</span>
          </label>
        </div>

        {/* Tributary area */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-xs text-ink-dim">
              Area di influenza per nodo [m²]
            </label>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                const r = computeTributaryAreas(model);
                if (r.stats.n_nodes_with_tributary === 0) {
                  toast(
                    "error",
                    "Topologia priva di beam/shell: impossibile derivare aree. Usa valore manuale.",
                  );
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
            >
              🤖 Auto da topologia
            </Button>
          </div>
          <input
            type="number"
            min={0.01}
            max={1000}
            step={0.1}
            value={tributaryArea}
            onChange={(e) => setTributaryArea(Number(e.target.value) || 1.0)}
            className="w-32 bg-bg-elevated border border-border rounded px-2 py-1 text-sm font-mono"
            data-testid="apply-tributary-area"
          />
          <div className="text-[10px] text-ink-dim">
            magnitudo = q · area. Es. wind = q_p × {tributaryArea.toFixed(2)} = <strong>{((bundle.meteo?.wind.q_p_z10_kN_m2 ?? 0) * tributaryArea).toFixed(3)} kN</strong>/nodo
          </div>
        </div>

        {/* Skip constrained */}
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={skipConstrained}
            onChange={(e) => setSkipConstrained(e.target.checked)}
            data-testid="apply-skip-constrained"
          />
          <span>Salta nodi vincolati (raccomandato)</span>
        </label>

        {/* Preview */}
        {preview && (
          <div
            className="bg-accent/10 border border-accent/30 rounded p-2 text-xs space-y-1"
            data-testid="apply-preview"
          >
            <div className="font-semibold text-accent">Anteprima</div>
            <div>
              Carichi da aggiungere: <strong>{preview.loads.length}</strong> ({preview.n_nodes_loaded} nodi × {(preview.loads.length / Math.max(preview.n_nodes_loaded, 1)).toFixed(0)} per nodo)
            </div>
            {preview.n_nodes_skipped > 0 && (
              <div className="text-ink-dim">
                {preview.n_nodes_skipped} nodi vincolati saltati
              </div>
            )}
            {preview.wind_force_kN > 0 && (
              <div>Wind force/nodo: <strong>{preview.wind_force_kN.toFixed(3)} kN</strong></div>
            )}
            {preview.snow_force_kN > 0 && (
              <div>Snow force/nodo: <strong>{preview.snow_force_kN.toFixed(3)} kN</strong></div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
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
            ✓ Aggiungi {preview?.loads.length ?? 0} carichi al modello
          </Button>
        </div>

        <div className="text-[10px] text-ink-dim italic pt-1">
          NB v1.4 alpha: tributary area uniforme = stima preliminare. Per
          progetto reale definire area per nodo basata sulla facciata reale.
        </div>
      </div>
    </Dialog>
  );
}
