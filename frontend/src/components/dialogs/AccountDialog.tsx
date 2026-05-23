/**
 * AccountDialog (Precision v2.0 PR17 T9) — account multi-tab Precision-aligned.
 *
 * Tabs:
 *   1. Usage    — `GET /api/usage/{user_id}/summary`
 *   2. Tier     — `GET/POST /api/quotas/{user_id}[/tier]`
 *   3. Providers — `GET /api/providers-usage`
 *   4. Admin    — `POST /api/quotas/{user_id}/{reset,bonus}`
 *
 * Footer: link a `/api/validation/report`.
 */
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BarChart3, Gem, Globe2, Settings2, FlaskConical } from "lucide-react";

import { Dialog } from "./Dialog";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/Tabs";
import { toast } from "../../store/toastStore";
import {
  getQuota,
  setQuotaTier,
  type Tier,
  type UserQuota,
} from "../../api/billing";
import {
  getUsageSummary,
  resetQuota,
  addQuotaBonus,
  type UsageSummary,
} from "../../api/usage";
import {
  getProvidersSummary,
  type ProviderUsageSummary,
} from "../../api/providers-usage";
import { DEFAULT_USER_ID } from "../../hooks/useCostPreview";


interface Props {
  open: boolean;
  onClose: () => void;
  userId?: string;
}


const TIER_LABELS: Record<Tier, string> = {
  free:       "Free · 50 crediti/mese",
  starter:    "Starter · 500 crediti/mese",
  pro:        "Pro · 5.000 crediti/mese",
  enterprise: "Enterprise · illimitato",
};

const inputCls = "px-2 py-1 text-sm bg-bg-elevated border border-border-light text-ink focus:border-accent focus:outline-none transition-colors";
const fieldLabel = "font-mono text-[10px] uppercase tracking-wide-1 text-ink-3 font-semibold";


export function AccountDialog({ open, onClose, userId = DEFAULT_USER_ID }: Props) {
  return (
    <Dialog open={open} onClose={onClose} title={`Account · ${userId}`} width={680}>
      <Tabs defaultValue="usage" className="flex flex-col">
        <TabsList>
          <TabsTrigger value="usage">
            <span className="inline-flex items-center gap-1.5">
              <BarChart3 className="w-3 h-3" /> Usage
            </span>
          </TabsTrigger>
          <TabsTrigger value="tier">
            <span className="inline-flex items-center gap-1.5">
              <Gem className="w-3 h-3" /> Tier
            </span>
          </TabsTrigger>
          <TabsTrigger value="providers">
            <span className="inline-flex items-center gap-1.5">
              <Globe2 className="w-3 h-3" /> Providers
            </span>
          </TabsTrigger>
          <TabsTrigger value="admin">
            <span className="inline-flex items-center gap-1.5">
              <Settings2 className="w-3 h-3" /> Admin
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="usage" className="pt-4">
          <UsageTab userId={userId} />
        </TabsContent>
        <TabsContent value="tier" className="pt-4">
          <TierTab userId={userId} />
        </TabsContent>
        <TabsContent value="providers" className="pt-4">
          <ProvidersTab />
        </TabsContent>
        <TabsContent value="admin" className="pt-4">
          <AdminTab userId={userId} />
        </TabsContent>
      </Tabs>

      <div className="mt-5 pt-3 border-t border-border">
        <a
          href="/api/validation/report"
          target="_blank"
          rel="noopener"
          className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wide-1 text-accent hover:underline"
          data-testid="validation-report-link"
        >
          <FlaskConical className="w-3 h-3" />
          View system validation report →
        </a>
      </div>
    </Dialog>
  );
}


function UsageTab({ userId }: { userId: string }) {
  const [windowDays, setWindowDays] = useState(30);
  const q = useQuery<UsageSummary>({
    queryKey: ["usage-summary", userId, windowDays],
    queryFn: () => getUsageSummary(userId, windowDays),
  });

  if (q.isLoading) return (
    <div className="flex items-center gap-2 text-sm text-ink-3 py-2">
      <span className="inline-block w-3 h-3 border-[1.5px] border-ink-3/40 border-t-accent animate-spin" />
      Caricamento usage…
    </div>
  );
  if (q.isError || !q.data) return (
    <div className="px-3 py-2 bg-bg-danger border border-danger/40 text-sm text-danger">
      Errore caricamento usage
    </div>
  );
  const s = q.data;
  return (
    <div className="space-y-4" data-testid="usage-tab">
      <div className="flex items-center gap-2">
        <label className={fieldLabel}>Finestra:</label>
        <select
          className={inputCls}
          value={windowDays}
          onChange={(e) => setWindowDays(Number(e.target.value))}
          data-testid="usage-window"
        >
          <option value={7}>7 giorni</option>
          <option value={30}>30 giorni</option>
          <option value={90}>90 giorni</option>
          <option value={365}>1 anno</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Stat label="Job totali" value={String(s.n_jobs)} />
        <Stat label="Crediti consumati" value={s.total_credits.toFixed(2)} />
      </div>

      {s.n_jobs > 0 && (
        <>
          <div>
            <div className={`${fieldLabel} mb-2`}>Per solver</div>
            <div className="flex flex-wrap gap-1">
              {Object.entries(s.jobs_by_solver).map(([k, v]) => (
                <Badge key={k} size="sm" variant="default">
                  {k}: <strong className="ml-1">{v}</strong>
                </Badge>
              ))}
            </div>
          </div>
          <div>
            <div className={`${fieldLabel} mb-2`}>Per status</div>
            <div className="flex flex-wrap gap-1">
              {Object.entries(s.jobs_by_status).map(([k, v]) => (
                <Badge
                  key={k}
                  size="sm"
                  variant={k === "done" ? "success" : k === "failed" ? "warn" : "info"}
                >
                  {k}: <strong className="ml-1">{v}</strong>
                </Badge>
              ))}
            </div>
          </div>
          {s.last_job_at && (
            <div className="font-mono text-[11px] text-ink-3">
              Ultimo job: {new Date(s.last_job_at * 1000).toLocaleString()}
            </div>
          )}
        </>
      )}
    </div>
  );
}


function TierTab({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const q = useQuery<UserQuota>({
    queryKey: ["quota", userId],
    queryFn: () => getQuota(userId),
  });
  const [selected, setSelected] = useState<Tier | null>(null);

  const mut = useMutation({
    mutationFn: (tier: Tier) => setQuotaTier(userId, tier),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quota", userId] });
      toast("success", "Tier aggiornato");
      setSelected(null);
    },
    onError: (e) => toast("error", `Errore tier: ${(e as Error).message}`),
  });

  if (q.isLoading || !q.data) {
    return (
      <div className="flex items-center gap-2 text-sm text-ink-3 py-2">
        <span className="inline-block w-3 h-3 border-[1.5px] border-ink-3/40 border-t-accent animate-spin" />
        Caricamento tier…
      </div>
    );
  }
  const cur = q.data;
  const target = selected ?? cur.tier;

  return (
    <div className="space-y-4" data-testid="tier-tab">
      <div>
        <div className={`${fieldLabel} mb-2`}>Tier corrente</div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge size="md" variant="info">{cur.tier.toUpperCase()}</Badge>
          <span className="font-mono text-sm text-ink">
            {cur.used_credits.toFixed(2)} / {cur.cap_credits.toFixed(0)} crediti
            {cur.bonus_credits > 0 && (
              <span className="text-success font-semibold ml-1">
                +{cur.bonus_credits.toFixed(0)} bonus
              </span>
            )}
          </span>
        </div>
      </div>

      <div>
        <div className={`${fieldLabel} mb-2`}>Cambia tier</div>
        <select
          className={`${inputCls} w-full py-1.5`}
          value={target}
          onChange={(e) => setSelected(e.target.value as Tier)}
          data-testid="tier-select"
        >
          {(Object.keys(TIER_LABELS) as Tier[]).map((t) => (
            <option key={t} value={t}>{TIER_LABELS[t]}</option>
          ))}
        </select>
      </div>

      <Button
        size="sm"
        variant="primary"
        disabled={!selected || selected === cur.tier || mut.isPending}
        loading={mut.isPending}
        onClick={() => selected && mut.mutate(selected)}
        data-testid="tier-apply"
      >
        Applica nuovo tier
      </Button>
    </div>
  );
}


function AdminTab({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const [bonus, setBonus] = useState("");

  const reset = useMutation({
    mutationFn: () => resetQuota(userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quota", userId] });
      qc.invalidateQueries({ queryKey: ["usage-summary", userId] });
      toast("success", "Quota resettata per il mese corrente");
    },
    onError: (e) => toast("error", `Errore reset: ${(e as Error).message}`),
  });
  const bonusMut = useMutation({
    mutationFn: () => addQuotaBonus(userId, Number(bonus)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quota", userId] });
      toast("success", `Bonus +${bonus} crediti aggiunto`);
      setBonus("");
    },
    onError: (e) => toast("error", `Errore bonus: ${(e as Error).message}`),
  });

  return (
    <div className="space-y-5" data-testid="admin-tab">
      <div>
        <div className={`${fieldLabel} mb-1`}>Reset mese</div>
        <div className="text-[11px] text-ink-3 mb-2 leading-snug">
          Azzera used_credits e bonus per il mese corrente.
        </div>
        <Button
          size="sm"
          variant="outline"
          loading={reset.isPending}
          onClick={() => reset.mutate()}
          data-testid="admin-reset"
        >
          Reset mese
        </Button>
      </div>

      <div className="pt-4 border-t border-border">
        <div className={`${fieldLabel} mb-1`}>Aggiungi bonus crediti</div>
        <div className="text-[11px] text-ink-3 mb-2 leading-snug">
          Bonus crediti aggiunti al mese corrente (non rinnovati).
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            step={1}
            value={bonus}
            onChange={(e) => setBonus(e.target.value)}
            placeholder="es. 100"
            className={`${inputCls} w-36 font-mono tabular-nums`}
            data-testid="admin-bonus-input"
          />
          <Button
            size="sm"
            variant="primary"
            disabled={!bonus || Number(bonus) <= 0}
            loading={bonusMut.isPending}
            onClick={() => bonusMut.mutate()}
            data-testid="admin-bonus-apply"
          >
            Aggiungi
          </Button>
        </div>
      </div>
    </div>
  );
}


function ProvidersTab() {
  const [windowDays, setWindowDays] = useState(30);
  const [domainFilter, setDomainFilter] = useState<string>("");

  const q = useQuery<ProviderUsageSummary>({
    queryKey: ["providers-usage", windowDays, domainFilter],
    queryFn: () =>
      getProvidersSummary({
        window_days: windowDays,
        ...(domainFilter ? { domain: domainFilter } : {}),
      }),
  });

  if (q.isLoading) return (
    <div className="flex items-center gap-2 text-sm text-ink-3 py-2">
      <span className="inline-block w-3 h-3 border-[1.5px] border-ink-3/40 border-t-accent animate-spin" />
      Caricamento providers…
    </div>
  );
  if (q.isError || !q.data) return (
    <div className="px-3 py-2 bg-bg-danger border border-danger/40 text-sm text-danger">
      Errore caricamento
    </div>
  );

  const data = q.data;
  const hasData = data.rows.length > 0;

  return (
    <div className="space-y-4" data-testid="providers-tab">
      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <label className={fieldLabel}>Finestra:</label>
        <select
          className={inputCls}
          value={windowDays}
          onChange={(e) => setWindowDays(Number(e.target.value))}
          data-testid="providers-window"
        >
          <option value={1}>1 giorno</option>
          <option value={7}>7 giorni</option>
          <option value={30}>30 giorni</option>
          <option value={90}>90 giorni</option>
        </select>

        <label className={`${fieldLabel} ml-2`}>Dominio:</label>
        <select
          className={inputCls}
          value={domainFilter}
          onChange={(e) => setDomainFilter(e.target.value)}
          data-testid="providers-domain"
        >
          <option value="">Tutti</option>
          <option value="meteo">meteo</option>
          <option value="geocoding">geocoding</option>
          <option value="elevation">elevation</option>
          <option value="seismic">seismic</option>
        </select>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <Stat label="Chiamate totali" value={String(data.totals.n_calls)} />
        <Stat
          label="Cache hit"
          value={`${data.totals.n_cache_hits} · ${(data.totals.cache_hit_ratio * 100).toFixed(0)}%`}
        />
        <Stat
          label="Errori"
          value={`${data.totals.n_errors} · ${(data.totals.error_ratio * 100).toFixed(1)}%`}
        />
      </div>

      {!hasData && (
        <div className="text-sm text-ink-3 italic py-4 px-3 text-center bg-bg-panel border border-border">
          Nessuna chiamata registrata nell'intervallo. Apri TopBar → Loads e cerca
          una location per generare traffico.
        </div>
      )}
      {hasData && (
        <div className="border border-border overflow-x-auto bg-bg-elevated">
          <table className="w-full text-sm" data-testid="providers-table">
            <thead className="bg-bg-panel">
              <tr>
                <th className="px-3 py-2 text-left font-mono text-[10px] uppercase tracking-wide-1 text-ink-3 font-semibold">
                  Provider · Endpoint
                </th>
                <th className="px-3 py-2 text-right font-mono text-[10px] uppercase tracking-wide-1 text-ink-3 font-semibold">Calls</th>
                <th className="px-3 py-2 text-right font-mono text-[10px] uppercase tracking-wide-1 text-ink-3 font-semibold">Cache</th>
                <th className="px-3 py-2 text-right font-mono text-[10px] uppercase tracking-wide-1 text-ink-3 font-semibold">Err</th>
                <th className="px-3 py-2 text-right font-mono text-[10px] uppercase tracking-wide-1 text-ink-3 font-semibold">Lat avg [ms]</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r, i) => (
                <tr
                  key={`${r.domain}-${r.provider}-${r.endpoint}-${i}`}
                  className="border-t border-border hover:bg-bg-hover"
                  data-testid={`providers-row-${i}`}
                >
                  <td className="px-3 py-1.5">
                    <div className="font-semibold text-ink text-sm">{r.provider}</div>
                    <div className="font-mono text-[10px] text-ink-3">
                      {r.domain} · {r.endpoint}
                    </div>
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono text-sm tabular-nums">{r.n_calls}</td>
                  <td className="px-3 py-1.5 text-right font-mono text-sm tabular-nums">
                    <span className={r.cache_hit_ratio > 0.5 ? "text-accent font-semibold" : "text-ink-2"}>
                      {(r.cache_hit_ratio * 100).toFixed(0)}%
                    </span>
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono text-sm tabular-nums">
                    <span className={r.n_errors > 0 ? "text-danger font-semibold" : "text-ink-3"}>
                      {r.n_errors}
                    </span>
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono text-sm tabular-nums text-ink-2">
                    {r.avg_latency_ms.toFixed(0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="text-[10px] text-ink-3 italic leading-snug">
        Dati tracker F6 · services/usage_tracker · 1 record per ogni chiamata provider F4
        dei facade B1-B4 · SQLite persistente su volume Fly.
      </div>
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
