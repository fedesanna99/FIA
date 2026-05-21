/**
 * LocationPickerDialog — UI integration Sprint 2 (B1+B2+B3+B4).
 *
 * Workflow 3-step:
 *   1. SEARCH: l'utente digita una location ("Cagliari, Italy") -> B1
 *      geocoding cerca via Open-Meteo (primary) / Nominatim (fallback).
 *      Mostra lista risultati, l'utente seleziona quello giusto.
 *   2. PREVIEW: una volta selezionata la location, mostra elevation
 *      (B2 terrain.lookup_points su singolo punto) + bbox stats.
 *   3. LOADS: l'utente vede wind/snow (B4) + sismica (B3) calcolati
 *      live per la location. Apply chiude il dialog e passa i loads
 *      al parent (onApply callback).
 */
import { useState } from "react";
import { useMutation, useQuery, type UseQueryResult } from "@tanstack/react-query";

import { Dialog } from "./Dialog";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/Tabs";
import { toast } from "../../store/toastStore";
import { useClimateStore } from "../../store/climateStore";
import {
  geocodingSearch,
  type Location,
} from "../../api/geocoding";
import { terrainBatch } from "../../api/terrain";
import {
  computeMeteoLoads,
  computeSeismicLoads,
  type MeteoLoadsResult,
  type SeismicLoadsResult,
  type SoilCategory,
} from "../../api/loads";
import { LOCATION_PRESETS } from "../../lib/locationPresets";


export interface LocationLoadsBundle {
  location: Location;
  elevation_m: number | null;
  meteo: MeteoLoadsResult | null;
  seismic: SeismicLoadsResult | null;
}


/**
 * Equivalente di `ClimateBundle` in store/climateStore (senza `computed_at`).
 * Lasciato come export per backward compat con il test esistente.
 */


interface Props {
  open: boolean;
  onClose: () => void;
  onApply?: (bundle: LocationLoadsBundle) => void;
  initialQuery?: string;
}


export function LocationPickerDialog({ open, onClose, onApply, initialQuery = "" }: Props) {
  const [query, setQuery] = useState(initialQuery);
  const [selected, setSelected] = useState<Location | null>(null);
  const [soilCategory, setSoilCategory] = useState<SoilCategory>("A");

  // Step 1: search
  const search = useMutation({
    mutationFn: (q: string) => geocodingSearch(q, 8, "en"),
    onError: (e) => toast("error", `Geocoding error: ${(e as Error).message}`),
  });

  // Step 2: elevation (single point batch)
  const elev = useQuery({
    queryKey: ["terrain", selected?.lat, selected?.lon],
    queryFn: () =>
      terrainBatch([{ lat: selected!.lat, lon: selected!.lon }]),
    enabled: !!selected,
    staleTime: 60_000,
  });

  // Step 3: loads
  const meteo = useQuery({
    queryKey: ["meteo-loads", selected?.lat, selected?.lon],
    queryFn: () =>
      computeMeteoLoads({ lat: selected!.lat, lon: selected!.lon, years: 80 }),
    enabled: !!selected,
    staleTime: 60_000,
  });

  const seismic = useQuery({
    queryKey: ["seismic-loads", selected?.lat, selected?.lon, soilCategory],
    queryFn: () =>
      computeSeismicLoads({
        lat: selected!.lat,
        lon: selected!.lon,
        soil_category: soilCategory,
      }),
    enabled: !!selected,
    staleTime: 60_000,
  });

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim().length === 0) return;
    setSelected(null);
    search.mutate(query.trim());
  };

  const onSelect = (loc: Location) => {
    setSelected(loc);
  };

  const onApplyClick = () => {
    if (!selected || !onApply) {
      onClose();
      return;
    }
    const elevation_m = elev.data?.points[0]?.elevation_m ?? null;
    onApply({
      location: selected,
      elevation_m,
      meteo: meteo.data ?? null,
      seismic: seismic.data ?? null,
    });
    toast("success", `Loads applicati per ${selected.name}`);
    onClose();
  };

  const reset = () => {
    setQuery("");
    setSelected(null);
  };

  /**
   * Preset rapido: salva direttamente il bundle nel climateStore + chiude
   * il dialog. NO API call — i valori sono indicativi (vedi locationPresets.ts).
   */
  const setBundleDirect = useClimateStore((s) => s.setBundle);
  const applyPreset = (key: string) => {
    const p = LOCATION_PRESETS.find((x) => x.key === key);
    if (!p) return;
    setBundleDirect(p.bundle);
    if (onApply) {
      onApply({
        location: p.bundle.location,
        elevation_m: p.bundle.elevation_m,
        meteo: p.bundle.meteo,
        seismic: p.bundle.seismic,
      });
    }
    toast(
      "success",
      `${p.emoji} Preset ${p.label} caricato (valori indicativi)`,
    );
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="🌍 Picker location → loads"
      width={640}
    >
      <div className="px-2 py-2" data-testid="location-picker-dialog">
        {/* Step 0: Demo presets (solo se nessuna location selezionata) */}
        {!selected && (
          <div className="mb-3" data-testid="location-presets">
            <div className="text-[10px] text-ink-dim mb-1 px-1">
              ⚡ Preset rapidi (valori indicativi · no API call):
            </div>
            <div className="flex flex-wrap gap-1.5">
              {LOCATION_PRESETS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => applyPreset(p.key)}
                  title={p.description}
                  className="px-2.5 py-1 rounded bg-bg-elevated border border-border hover:bg-bg-hover hover:border-accent/40 text-[11px] flex items-center gap-1 transition-colors"
                  data-testid={`location-preset-${p.key}`}
                >
                  <span>{p.emoji}</span>
                  <span>{p.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 1: Search */}
        <form onSubmit={onSearchSubmit} className="flex items-center gap-2 mb-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="es. Cagliari, Italy"
            className="flex-1 px-3 py-1.5 rounded bg-bg-elevated border border-border text-sm text-ink"
            data-testid="location-search-input"
          />
          <Button
            type="submit"
            size="sm"
            variant="primary"
            disabled={query.trim().length === 0 || search.isPending}
            loading={search.isPending}
            data-testid="location-search-submit"
          >
            🔍 Cerca
          </Button>
          {selected && (
            <Button size="sm" variant="ghost" onClick={reset} data-testid="location-reset">
              ↺ Reset
            </Button>
          )}
        </form>

        {/* Step 1b: Results list */}
        {!selected && search.data && (
          <div className="space-y-1 mb-3" data-testid="location-results">
            {search.data.results.length === 0 && (
              <div className="text-xs text-ink-dim p-2">Nessun risultato.</div>
            )}
            {search.data.results.map((r, i) => (
              <button
                key={`${r.source}-${i}-${r.lat}-${r.lon}`}
                onClick={() => onSelect(r)}
                className="w-full text-left px-3 py-2 rounded border border-border hover:bg-bg-hover text-sm"
                data-testid={`location-result-${i}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-ink">{r.name}</span>
                  <Badge size="sm" variant="info">{r.source}</Badge>
                </div>
                <div className="text-[10px] text-ink-dim font-mono">
                  {r.lat.toFixed(4)}, {r.lon.toFixed(4)}
                  {r.country && ` · ${r.country}`}
                  {r.admin1 && ` · ${r.admin1}`}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Step 2 + 3: Selected location → loads */}
        {selected && (
          <div data-testid="location-detail">
            <div className="px-3 py-2 rounded bg-bg-elevated border border-border mb-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-ink text-sm">{selected.name}</span>
                <span className="text-[10px] font-mono text-ink-dim">
                  {selected.lat.toFixed(4)}, {selected.lon.toFixed(4)}
                </span>
              </div>
              <div className="text-[10px] text-ink-dim mt-0.5">
                {selected.country} {selected.admin1 && `· ${selected.admin1}`}
                {elev.data && ` · quota ${elev.data.points[0]?.elevation_m?.toFixed(0)} m s.l.m.`}
              </div>
            </div>

            <Tabs defaultValue="meteo" className="flex flex-col">
              <TabsList>
                <TabsTrigger value="meteo">🌬️ Vento / Neve</TabsTrigger>
                <TabsTrigger value="seismic">🌋 Sismica</TabsTrigger>
              </TabsList>

              <TabsContent value="meteo" className="pt-3">
                <MeteoTab query={meteo} />
              </TabsContent>
              <TabsContent value="seismic" className="pt-3">
                <SeismicTab
                  query={seismic}
                  soilCategory={soilCategory}
                  onSoilChange={setSoilCategory}
                />
              </TabsContent>
            </Tabs>

            <div className="mt-4 pt-3 border-t border-border flex items-center justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={onClose}>
                Annulla
              </Button>
              <Button
                size="sm"
                variant="primary"
                disabled={meteo.isPending || seismic.isPending}
                onClick={onApplyClick}
                data-testid="location-apply"
              >
                ✓ Applica al modello
              </Button>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
}


// ---- Tab MeteoLoads -----------------------------------------------------

function MeteoTab({ query }: { query: UseQueryResult<MeteoLoadsResult, Error> }) {
  if (query.isLoading) return <div className="text-xs text-ink-dim">Calcolo vento + neve...</div>;
  if (query.isError || !query.data) return <div className="text-xs text-error">Errore meteo loads</div>;
  const d = query.data;
  return (
    <div className="space-y-3 text-sm" data-testid="meteo-tab">
      <div>
        <div className="text-xs font-semibold text-ink-dim mb-1">Vento (EN 1991-1-4)</div>
        <div className="grid grid-cols-2 gap-2">
          <Stat label="v_b,0 [m/s]" value={d.wind.v_b0_ms.toFixed(2)} />
          <Stat label="Gust max storico [m/s]" value={d.wind.gust_max_observed_ms.toFixed(2)} />
          <Stat label="q_b [kN/m²]" value={d.wind.q_b_kN_m2.toFixed(3)} />
          <Stat label="q_p(z=10m) [kN/m²]" value={d.wind.q_p_z10_kN_m2.toFixed(3)} />
        </div>
        <div className="text-[10px] text-ink-dim mt-1">
          Terreno {d.wind.terrain_category} · c_e={d.wind.c_e_z10} · gust factor={d.wind.gust_factor}
        </div>
      </div>

      <div>
        <div className="text-xs font-semibold text-ink-dim mb-1">Neve (EN 1991-1-3)</div>
        <div className="grid grid-cols-2 gap-2">
          <Stat label="s_k [kN/m²]" value={d.snow.s_k_kN_m2.toFixed(3)} />
          <Stat label="s_design [kN/m²]" value={d.snow.s_design_kN_m2.toFixed(3)} />
          <Stat label="Neve max storica [cm]" value={d.snow.snowfall_max_observed_cm.toFixed(1)} />
          <Stat label="μ_i (tetto piano)" value={d.snow.mu_i_default.toFixed(2)} />
        </div>
      </div>

      {d.notes.length > 0 && (
        <div className="text-[10px] text-ink-dim space-y-1">
          {d.notes.map((n, i) => (
            <div key={i}>· {n}</div>
          ))}
        </div>
      )}
    </div>
  );
}


// ---- Tab SeismicLoads ---------------------------------------------------

function SeismicTab({
  query, soilCategory, onSoilChange,
}: {
  query: UseQueryResult<SeismicLoadsResult, Error>;
  soilCategory: SoilCategory;
  onSoilChange: (c: SoilCategory) => void;
}) {
  return (
    <div className="space-y-3 text-sm" data-testid="seismic-tab">
      <div className="flex items-center gap-2">
        <label className="text-xs text-ink-dim">Categoria suolo:</label>
        <select
          className="text-xs bg-bg-elevated border border-border rounded px-2 py-1"
          value={soilCategory}
          onChange={(e) => onSoilChange(e.target.value as SoilCategory)}
          data-testid="soil-category-select"
        >
          {(["A", "B", "C", "D", "E"] as const).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {query.isLoading && <div className="text-xs text-ink-dim">Calcolo sismica...</div>}
      {query.isError && <div className="text-xs text-error">Errore sismica</div>}
      {query.data && (
        <>
          <div>
            <div className="text-xs font-semibold text-ink-dim mb-1">Parametri NTC 2018 §3.2</div>
            <div className="grid grid-cols-2 gap-2">
              <Stat label="a_g/g" value={query.data.site_params.a_g_over_g.toFixed(4)} />
              <Stat label="F_0" value={query.data.site_params.F_0.toFixed(2)} />
              <Stat label="T_C* [s]" value={query.data.site_params.T_c_star_s.toFixed(3)} />
              <Stat label="S (sottosuolo)" value={query.data.site_params.S.toFixed(2)} />
              <Stat label="T_B [s]" value={query.data.site_params.T_B_s.toFixed(3)} />
              <Stat label="T_C [s]" value={query.data.site_params.T_C_s.toFixed(3)} />
              <Stat label="T_D [s]" value={query.data.site_params.T_D_s.toFixed(3)} />
              <Stat label="η (5% damping)" value={query.data.site_params.eta.toFixed(3)} />
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-ink-dim mb-1">M_max storico</div>
            <Badge size="md" variant="warn">
              Mw {query.data.historical_max_magnitude.toFixed(1)}
            </Badge>
            <span className="ml-2 text-[10px] text-ink-dim">
              entro {query.data.search_radius_km.toFixed(0)} km, ultimi {query.data.search_years_back} anni
            </span>
          </div>

          <div>
            <div className="text-xs font-semibold text-ink-dim mb-1">
              Spettro (plateau S_e/g)
            </div>
            <div className="text-sm font-mono text-ink">
              {(() => {
                const sp = query.data.site_params;
                const plateau = sp.a_g_over_g * sp.S * sp.eta * sp.F_0;
                return `≈ ${plateau.toFixed(3)} (T ∈ [${sp.T_B_s.toFixed(2)}, ${sp.T_C_s.toFixed(2)}] s)`;
              })()}
            </div>
          </div>

          {query.data.notes.length > 0 && (
            <div className="text-[10px] text-ink-dim space-y-1">
              {query.data.notes.map((n, i) => (
                <div key={i}>· {n}</div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}


function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-bg/40 border border-border rounded px-2 py-1.5">
      <div className="text-[9px] uppercase tracking-wider text-ink-dim">{label}</div>
      <div className="text-sm font-mono text-ink">{value}</div>
    </div>
  );
}
