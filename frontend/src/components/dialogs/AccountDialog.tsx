/**
 * AccountDialog (Sprint 1 follow-up — closes UX gaps GAP1-GAP5).
 *
 * Tre tab:
 *   1. Usage    — `GET /api/usage/{user_id}/summary` (GAP 1)
 *   2. Tier     — `GET/POST /api/quotas/{user_id}[/tier]` (GAP 4)
 *   3. Admin    — `POST /api/quotas/{user_id}/{reset,bonus}` (GAP 2, 3)
 *
 * Footer: link a `/api/validation/report` (GAP 5).
 */
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

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
import { DEFAULT_USER_ID } from "../../hooks/useCostPreview";


interface Props {
  open: boolean;
  onClose: () => void;
  userId?: string;
}


const TIER_LABELS: Record<Tier, string> = {
  free: "Free (50 crediti/mese)",
  starter: "Starter (500 crediti/mese)",
  pro: "Pro (5.000 crediti/mese)",
  enterprise: "Enterprise (illimitato)",
};


export function AccountDialog({ open, onClose, userId = DEFAULT_USER_ID }: Props) {
  return (
    <Dialog open={open} onClose={onClose} title={`Account — ${userId}`} width={520}>
      <div className="px-4 py-3">
        <Tabs defaultValue="usage" className="flex flex-col">
          <TabsList>
            <TabsTrigger value="usage">📊 Usage</TabsTrigger>
            <TabsTrigger value="tier">💎 Tier</TabsTrigger>
            <TabsTrigger value="admin">⚙️ Admin</TabsTrigger>
          </TabsList>

          <TabsContent value="usage" className="pt-3">
            <UsageTab userId={userId} />
          </TabsContent>
          <TabsContent value="tier" className="pt-3">
            <TierTab userId={userId} />
          </TabsContent>
          <TabsContent value="admin" className="pt-3">
            <AdminTab userId={userId} />
          </TabsContent>
        </Tabs>

        <div className="mt-4 pt-3 border-t border-border text-xs text-ink-dim">
          <a
            href="/api/validation/report"
            target="_blank"
            rel="noopener"
            className="text-accent hover:underline"
            data-testid="validation-report-link"
          >
            🧪 View system validation report →
          </a>
        </div>
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

  if (q.isLoading) return <div className="text-xs text-ink-dim">Caricamento usage...</div>;
  if (q.isError || !q.data) return <div className="text-xs text-error">Errore caricamento usage</div>;
  const s = q.data;
  return (
    <div className="space-y-3 text-sm" data-testid="usage-tab">
      <div className="flex items-center gap-2">
        <label className="text-xs text-ink-dim">Finestra:</label>
        <select
          className="text-xs bg-bg-elevated border border-border rounded px-2 py-1"
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
            <div className="text-xs font-semibold text-ink-dim mb-1">Per solver</div>
            <div className="flex flex-wrap gap-1">
              {Object.entries(s.jobs_by_solver).map(([k, v]) => (
                <Badge key={k} size="sm" variant="default">
                  {k}: <strong className="ml-1">{v}</strong>
                </Badge>
              ))}
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold text-ink-dim mb-1">Per status</div>
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
            <div className="text-xs text-ink-dim">
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
    return <div className="text-xs text-ink-dim">Caricamento tier...</div>;
  }
  const cur = q.data;
  const target = selected ?? cur.tier;

  return (
    <div className="space-y-3 text-sm" data-testid="tier-tab">
      <div>
        <div className="text-xs text-ink-dim mb-1">Tier corrente</div>
        <div className="flex items-center gap-2">
          <Badge size="md" variant="info">{cur.tier.toUpperCase()}</Badge>
          <span className="font-mono text-xs">
            {cur.used_credits.toFixed(2)} / {cur.cap_credits.toFixed(0)} crediti
            {cur.bonus_credits > 0 && ` (+${cur.bonus_credits.toFixed(0)} bonus)`}
          </span>
        </div>
      </div>

      <div>
        <div className="text-xs text-ink-dim mb-1">Cambia tier</div>
        <select
          className="w-full text-sm bg-bg-elevated border border-border rounded px-2 py-1.5"
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
        onClick={() => selected && mut.mutate(selected)}
        data-testid="tier-apply"
      >
        {mut.isPending ? "Aggiornamento..." : "Applica nuovo tier"}
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
    <div className="space-y-4 text-sm" data-testid="admin-tab">
      <div>
        <div className="text-xs font-semibold mb-1">Reset mese</div>
        <div className="text-[10px] text-ink-dim mb-2">
          Azzera used_credits e bonus per il mese corrente.
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => reset.mutate()}
          disabled={reset.isPending}
          data-testid="admin-reset"
        >
          {reset.isPending ? "Reset..." : "Reset mese"}
        </Button>
      </div>

      <div className="pt-3 border-t border-border">
        <div className="text-xs font-semibold mb-1">Aggiungi bonus crediti</div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            step={1}
            value={bonus}
            onChange={(e) => setBonus(e.target.value)}
            placeholder="es. 100"
            className="text-sm bg-bg-elevated border border-border rounded px-2 py-1 w-32"
            data-testid="admin-bonus-input"
          />
          <Button
            size="sm"
            variant="ghost"
            disabled={!bonus || Number(bonus) <= 0 || bonusMut.isPending}
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


function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-bg/40 border border-border rounded px-2 py-1.5">
      <div className="text-[9px] uppercase tracking-wider text-ink-dim">{label}</div>
      <div className="text-sm font-mono text-ink">{value}</div>
    </div>
  );
}
