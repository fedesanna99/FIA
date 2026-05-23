/**
 * ClimateContextBadge — compact pill che mostra i valori climatici/sismici
 * della location attualmente attiva (dal climateStore).
 *
 * Posizione: floating top-left del viewport 3D, sotto la TopBar.
 * Visibile solo quando bundle != null. Pulsanti:
 *   - "Modifica" -> apre LocationPickerDialog (callback onReopen)
 *   - "X" -> clear store
 */
import { useState } from "react";
import { MapPin, X, Edit2, Wrench } from "lucide-react";

import { useClimateStore } from "../../store/climateStore";
import { Tooltip } from "../ui/Tooltip";
import { ApplyClimateLoadsDialog } from "../dialogs/ApplyClimateLoadsDialog";


interface Props {
  onReopen?: () => void;
}


export function ClimateContextBadge({ onReopen }: Props) {
  const bundle = useClimateStore((s) => s.bundle);
  const clear = useClimateStore((s) => s.clear);
  const [expanded, setExpanded] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);

  if (!bundle) return null;

  const { location, elevation_m, meteo, seismic, computed_at } = bundle;

  const minutesAgo = Math.floor((Date.now() - computed_at) / 60_000);
  const ageLabel =
    minutesAgo < 1
      ? "appena ora"
      : minutesAgo < 60
      ? `${minutesAgo} min fa`
      : `${Math.floor(minutesAgo / 60)} h fa`;

  return (
    <div
      className="fixed top-14 left-3 z-40 max-w-md bg-bg-panel/95 backdrop-blur border border-border rounded-lg shadow-lg text-xs"
      data-testid="climate-context-badge"
    >
      <div className="flex items-center gap-1.5 px-2.5 py-1.5">
        <MapPin className="h-3.5 w-3.5 text-accent flex-shrink-0" />
        <button
          className="font-semibold text-ink hover:text-accent transition-colors truncate"
          onClick={() => setExpanded((v) => !v)}
          title="Click per espandere/comprimere"
        >
          {location.name}
        </button>
        <span className="text-[10px] text-ink-3 font-mono whitespace-nowrap">
          {location.lat.toFixed(3)}, {location.lon.toFixed(3)}
          {elevation_m != null && ` · ${elevation_m.toFixed(0)} m`}
        </span>
        <div className="flex-1" />
        {onReopen && (
          <Tooltip content="Cambia location">
            <button
              className="p-1 hover:bg-bg-hover rounded text-ink-3 hover:text-ink"
              onClick={onReopen}
              data-testid="climate-badge-edit"
            >
              <Edit2 className="h-3 w-3" />
            </button>
          </Tooltip>
        )}
        <Tooltip content="Rimuovi context">
          <button
            className="p-1 hover:bg-error/20 rounded text-ink-3 hover:text-error"
            onClick={clear}
            data-testid="climate-badge-clear"
          >
            <X className="h-3 w-3" />
          </button>
        </Tooltip>
      </div>

      {expanded && (
        <div
          className="px-3 py-2 border-t border-border space-y-2 text-[11px]"
          data-testid="climate-badge-expanded"
        >
          {meteo && (
            <div>
              <div className="text-ink-3 font-semibold mb-0.5">🌬️ Vento + Neve (EN 1991)</div>
              <div className="flex items-center justify-between font-mono">
                <span>v_b,0 = {meteo.wind.v_b0_ms.toFixed(2)} m/s</span>
                <span>q_p(10m) = <strong className="text-accent">{meteo.wind.q_p_z10_kN_m2.toFixed(3)} kN/m²</strong></span>
              </div>
              <div className="flex items-center justify-between font-mono mt-0.5">
                <span>s_k = {meteo.snow.s_k_kN_m2.toFixed(3)}</span>
                <span>s_design = <strong className="text-accent">{meteo.snow.s_design_kN_m2.toFixed(3)} kN/m²</strong></span>
              </div>
            </div>
          )}

          {seismic && (
            <div>
              <div className="text-ink-3 font-semibold mb-0.5">🌋 Sismica (NTC 2018)</div>
              <div className="flex items-center justify-between font-mono">
                <span>M_max = Mw {seismic.historical_max_magnitude.toFixed(1)}</span>
                <span>a_g/g = <strong className="text-accent">{seismic.site_params.a_g_over_g.toFixed(4)}</strong></span>
              </div>
              <div className="flex items-center justify-between font-mono mt-0.5">
                <span>Soil {seismic.site_params.soil_category}</span>
                <span>S_e plateau ≈ <strong className="text-accent">{(seismic.site_params.a_g_over_g * seismic.site_params.S * seismic.site_params.eta * seismic.site_params.F_0).toFixed(3)}</strong></span>
              </div>
            </div>
          )}

          <div className="flex items-center gap-1 pt-1 border-t border-border">
            <button
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded bg-accent/20 hover:bg-accent/30 text-accent text-[11px] font-semibold transition-colors"
              onClick={() => setApplyOpen(true)}
              data-testid="climate-badge-apply"
            >
              <Wrench className="h-3 w-3" />
              Applica come carichi al modello
            </button>
          </div>

          <div className="text-[9px] text-ink-3 italic">
            calcolato {ageLabel} · valori da location reale via Open-Meteo + USGS + Open-Elevation
          </div>
        </div>
      )}

      <ApplyClimateLoadsDialog open={applyOpen} onClose={() => setApplyOpen(false)} />
    </div>
  );
}
