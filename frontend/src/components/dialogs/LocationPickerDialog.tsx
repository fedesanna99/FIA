/**
 * LocationPickerDialog (Precision v2.0 PR17 T8) — workflow 3-step Precision.
 *
 *   1. SEARCH: geocoding -> lista risultati (Open-Meteo / Nominatim)
 *   2. PREVIEW: elevation single point + location card
 *   3. LOADS: tabs Vento/Neve (B4) + Sismica (B3) live per la location
 *
 * Linguaggio Precision: hairline border, mono labels, sharp radius, no emoji.
 */
import { useState } from "react";
import { useMutation, useQuery, type UseQueryResult } from "@tanstack/react-query";
import { Search, RotateCcw, Wind, Mountain, MapPin } from "lucide-react";

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

  const search = useMutation({
    mutationFn: (q: string) => geocodingSearch(q, 8, "en"),
    onError: (e) => toast("error", `Geocoding error: ${(e as Error).message}`),
  });

  const elev = useQuery({
    queryKey: ["terrain", selected?.lat, selected?.lon],
    queryFn: () =>
      terrainBatch([{ lat: selected!.lat, lon: selected!.lon }]),
    enabled: !!selected,
    staleTime: 60_000,
  });

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
    toast("success", `Preset ${p.label} caricato · valori indicativi`);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Picker location · loads"
      width={680}
    >
      <div data-testid="location-picker-dialog">
        {/* Demo presets (solo se nessuna location selezionata) */}
        {!selected && (
          <div className="mb-4" data-testid="location-presets">
            <div className="font-mono text-[10px] uppercase tracking-wide-1 text-ink-3 font-semibold mb-2">
              Preset rapidi · valori indicativi · no API call
            </div>
            <div className="flex flex-wrap gap-1.5">
              {LOCATION_PRESETS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => applyPreset(p.key)}
                  title={p.description}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-bg-elevated border border-border-light hover:border-accent hover:bg-bg-hover text-[12px] text-ink-2 transition-colors"
                  data-testid={`location-preset-${p.key}`}
                >
                  <span>{p.emoji}</span>
                  <span>{p.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Search */}
        <form onSubmit={onSearchSubmit} className="flex items-center gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-3 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="es. Cagliari, Italy"
              className="w-full pl-7 pr-3 py-1.5 text-sm bg-bg-elevated border border-border-light text-ink placeholder:text-ink-3 focus:border-accent focus:outline-none transition-colors"
              data-testid="location-search-input"
            />
          </div>
          <Button
            type="submit"
            size="sm"
            variant="primary"
            disabled={query.trim().length === 0 || search.isPending}
            loading={search.isPending}
            data-testid="location-search-submit"
          >
            Cerca
          </Button>
          {selected && (
            <Button size="sm" variant="ghost" onClick={reset} data-testid="location-reset" iconLeft={<RotateCcw className="w-3 h-3" />}>
              Reset
            </Button>
          )}
        </form>

        {/* Results list */}
        {!selected && search.data && (
          <div className="space-y-1.5 mb-3" data-testid="location-results">
            {search.data.results.length === 0 && (
              <div className="text-sm text-ink-3 px-3 py-3 border border-border bg-bg-panel">
                Nessun risultato trovato per "{query}".
              </div>
            )}
            {search.data.results.map((r, i) => (
              <button
                key={`${r.source}-${i}-${r.lat}-${r.lon}`}
                type="button"
                onClick={() => onSelect(r)}
                className="w-full text-left px-3 py-2 bg-bg-elevated border border-border-light hover:border-accent hover:bg-bg-hover text-sm transition-colors"
                data-testid={`location-result-${i}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-ink truncate">{r.name}</span>
                  <Badge size="sm" variant="info">{r.source}</Badge>
                </div>
                <div className="text-[11px] font-mono text-ink-3 mt-0.5">
                  {r.lat.toFixed(4)}, {r.lon.toFixed(4)}
                  {r.country && ` · ${r.country}`}
                  {r.admin1 && ` · ${r.admin1}`}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Selected location → tabs loads */}
        {selected && (
          <div data-testid="location-detail">
            <div className="px-3 py-2.5 bg-accent-subtle/40 border border-accent/30 mb-3">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 font-display text-base font-semibold tracking-tight-1 text-ink">
                  <MapPin className="w-3.5 h-3.5 text-accent" />
                  {selected.name}
                </span>
                <span className="font-mono text-[10px] text-ink-3">
                  {selected.lat.toFixed(4)}, {selected.lon.toFixed(4)}
                </span>
              </div>
              <div className="text-[11px] text-ink-3 mt-0.5">
                {selected.country} {selected.admin1 && `· ${selected.admin1}`}
                {elev.data && ` · quota ${elev.data.points[0]?.elevation_m?.toFixed(0)} m s.l.m.`}
              </div>
            </div>

            <Tabs defaultValue="meteo" className="flex flex-col">
              <TabsList>
                <TabsTrigger value="meteo">
                  <span className="inline-flex items-center gap-1.5">
                    <Wind className="w-3 h-3" /> Vento · Neve
                  </span>
                </TabsTrigger>
                <TabsTrigger value="seismic">
                  <span className="inline-flex items-center gap-1.5">
                    <Mountain className="w-3 h-3" /> Sismica
                  </span>
                </TabsTrigger>
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
                Applica al modello
              </Button>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
}


function MeteoTab({ query }: { query: UseQueryResult<MeteoLoadsResult, Error> }) {
  if (query.isLoading) return (
    <div className="flex items-center gap-2 text-sm text-ink-3 py-4">
      <span className="inline-block w-3 h-3 border-[1.5px] border-ink-3/40 border-t-accent animate-spin" />
      Calcolo vento + neve…
    </div>
  );
  if (query.isError || !query.data) return (
    <div className="px-3 py-2 bg-bg-danger border border-danger/40 text-sm text-danger">
      Errore meteo loads
    </div>
  );
  const d = query.data;
  return (
    <div className="space-y-4" data-testid="meteo-tab">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-wide-2 text-ink-3 font-semibold mb-2">
          Vento · EN 1991-1-4
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Stat label="v_b,0 [m/s]" value={d.wind.v_b0_ms.toFixed(2)} />
          <Stat label="Gust max [m/s]" value={d.wind.gust_max_observed_ms.toFixed(2)} />
          <Stat label="q_b [kN/m²]" value={d.wind.q_b_kN_m2.toFixed(3)} />
          <Stat label="q_p z=10m [kN/m²]" value={d.wind.q_p_z10_kN_m2.toFixed(3)} />
        </div>
        <div className="text-[11px] text-ink-3 mt-1.5 font-mono">
          Terreno {d.wind.terrain_category} · c_e={d.wind.c_e_z10} · gust={d.wind.gust_factor}
        </div>
      </div>

      <div>
        <div className="font-mono text-[10px] uppercase tracking-wide-2 text-ink-3 font-semibold mb-2">
          Neve · EN 1991-1-3
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Stat label="s_k [kN/m²]" value={d.snow.s_k_kN_m2.toFixed(3)} />
          <Stat label="s_design [kN/m²]" value={d.snow.s_design_kN_m2.toFixed(3)} />
          <Stat label="Neve max [cm]" value={d.snow.snowfall_max_observed_cm.toFixed(1)} />
          <Stat label="μ_i tetto piano" value={d.snow.mu_i_default.toFixed(2)} />
        </div>
      </div>

      {d.notes.length > 0 && (
        <div className="text-[11px] text-ink-3 space-y-1 border-t border-border pt-2">
          {d.notes.map((n, i) => (
            <div key={i} className="flex gap-1.5"><span className="text-accent">·</span>{n}</div>
          ))}
        </div>
      )}
    </div>
  );
}


function SeismicTab({
  query, soilCategory, onSoilChange,
}: {
  query: UseQueryResult<SeismicLoadsResult, Error>;
  soilCategory: SoilCategory;
  onSoilChange: (c: SoilCategory) => void;
}) {
  return (
    <div className="space-y-4" data-testid="seismic-tab">
      <div className="flex items-center gap-2">
        <label className="font-mono text-[10px] uppercase tracking-wide-1 text-ink-3 font-semibold">
          Categoria suolo:
        </label>
        <select
          className="text-sm bg-bg-elevated border border-border-light text-ink px-2 py-1 focus:border-accent focus:outline-none"
          value={soilCategory}
          onChange={(e) => onSoilChange(e.target.value as SoilCategory)}
          data-testid="soil-category-select"
        >
          {(["A", "B", "C", "D", "E"] as const).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {query.isLoading && (
        <div className="flex items-center gap-2 text-sm text-ink-3 py-2">
          <span className="inline-block w-3 h-3 border-[1.5px] border-ink-3/40 border-t-accent animate-spin" />
          Calcolo sismica…
        </div>
      )}
      {query.isError && (
        <div className="px-3 py-2 bg-bg-danger border border-danger/40 text-sm text-danger">
          Errore sismica
        </div>
      )}
      {query.data && (
        <>
          <div>
            <div className="font-mono text-[10px] uppercase tracking-wide-2 text-ink-3 font-semibold mb-2">
              Parametri NTC 2018 · §3.2
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Stat label="a_g/g" value={query.data.site_params.a_g_over_g.toFixed(4)} />
              <Stat label="F_0" value={query.data.site_params.F_0.toFixed(2)} />
              <Stat label="T_C* [s]" value={query.data.site_params.T_c_star_s.toFixed(3)} />
              <Stat label="S sottosuolo" value={query.data.site_params.S.toFixed(2)} />
              <Stat label="T_B [s]" value={query.data.site_params.T_B_s.toFixed(3)} />
              <Stat label="T_C [s]" value={query.data.site_params.T_C_s.toFixed(3)} />
              <Stat label="T_D [s]" value={query.data.site_params.T_D_s.toFixed(3)} />
              <Stat label="η · 5% damping" value={query.data.site_params.eta.toFixed(3)} />
            </div>
          </div>

          <div>
            <div className="font-mono text-[10px] uppercase tracking-wide-2 text-ink-3 font-semibold mb-2">
              M_max storico
            </div>
            <Badge size="md" variant="warn">
              Mw {query.data.historical_max_magnitude.toFixed(1)}
            </Badge>
            <span className="ml-2 text-[11px] text-ink-3 font-mono">
              entro {query.data.search_radius_km.toFixed(0)} km · ultimi {query.data.search_years_back} anni
            </span>
          </div>

          <div>
            <div className="font-mono text-[10px] uppercase tracking-wide-2 text-ink-3 font-semibold mb-2">
              Spettro plateau S_e/g
            </div>
            <div className="text-sm font-mono text-ink bg-bg-panel border border-border px-2.5 py-1.5">
              {(() => {
                const sp = query.data.site_params;
                const plateau = sp.a_g_over_g * sp.S * sp.eta * sp.F_0;
                return `≈ ${plateau.toFixed(3)} (T ∈ [${sp.T_B_s.toFixed(2)}, ${sp.T_C_s.toFixed(2)}] s)`;
              })()}
            </div>
          </div>

          {query.data.notes.length > 0 && (
            <div className="text-[11px] text-ink-3 space-y-1 border-t border-border pt-2">
              {query.data.notes.map((n, i) => (
                <div key={i} className="flex gap-1.5"><span className="text-accent">·</span>{n}</div>
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
    <div className="bg-bg-panel border border-border px-2.5 py-1.5">
      <div className="font-mono text-[9px] uppercase tracking-wide-2 text-ink-3 font-semibold">{label}</div>
      <div className="text-sm font-mono text-ink font-semibold tabular-nums">{value}</div>
    </div>
  );
}
