/**
 * CostPreviewDialog (Sprint 1 — A4).
 *
 * Mostra costo stimato di un solve (DOF, ETA, RAM, CPU, credits) + quota
 * residua. Bottoni Annulla/Procedi; "Procedi" e' disabilitato se quota esaurita.
 * Checkbox "Non mostrare piu'" persiste in localStorage (billingStore).
 */
import { Dialog } from "../Dialog";
import { Button } from "../../ui/Button";
import { useBillingStore } from "../../../store/billingStore";
import type { CostEstimate, UserQuota } from "../../../api/billing";

interface Props {
  open: boolean;
  estimate: CostEstimate | null;
  quota: UserQuota | null;
  isLoading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function fmtSec(s: number): string {
  if (s < 1) return `${(s * 1000).toFixed(0)} ms`;
  if (s < 60) return `${s.toFixed(1)} s`;
  const m = Math.floor(s / 60);
  const r = Math.round(s - m * 60);
  return `${m} m ${r} s`;
}

function fmtMb(mb: number): string {
  if (mb < 1024) return `${mb.toFixed(0)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

function fmtEur(credits: number): string {
  return `~€${(credits / 10).toFixed(2)}`;
}

export function CostPreviewDialog({
  open,
  estimate,
  quota,
  isLoading,
  onConfirm,
  onCancel,
}: Props) {
  const skipCostPreview = useBillingStore((s) => s.skipCostPreview);
  const setSkipCostPreview = useBillingStore((s) => s.setSkipCostPreview);

  const usedTotal = quota
    ? quota.used_credits + (estimate?.credits ?? 0)
    : 0;
  const capTotal = quota ? quota.cap_credits + quota.bonus_credits : 0;
  const overQuota = !!quota && !!estimate && usedTotal > capTotal + 1e-9;

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      title="Costo stimato del solve"
      width={460}
      footer={
        <div className="flex justify-end gap-2 px-4 py-2 border-t border-border">
          <Button variant="ghost" size="sm" onClick={onCancel} data-testid="cost-cancel">
            Annulla
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={!estimate || isLoading || overQuota}
            onClick={onConfirm}
            data-testid="cost-confirm"
          >
            {isLoading ? "Stima in corso..." : "Procedi"}
          </Button>
        </div>
      }
    >
      <div className="px-4 py-3 space-y-3 text-sm">
        {isLoading && (
          <div className="text-ink-3 text-xs" data-testid="cost-loading">
            Calcolo stima in corso...
          </div>
        )}
        {estimate && (
          <>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
              <Row label="Solver" value={estimate.solver} />
              <Row label="DOF" value={estimate.n_dof.toLocaleString("it-IT")} />
              <Row label="⏱️ ETA" value={fmtSec(estimate.eta_s)} />
              <Row label="💾 RAM" value={fmtMb(estimate.ram_mb)} />
              <Row label="⚙️ CPU" value={`${estimate.cpu_min.toFixed(3)} min`} />
              <Row
                label="💎 Crediti"
                value={`${estimate.credits.toFixed(2)} (${fmtEur(estimate.credits)})`}
              />
            </div>
            {estimate.explanation && (
              <div className="text-[10px] text-ink-3 italic border-l-2 border-border pl-2">
                {estimate.explanation}
              </div>
            )}
          </>
        )}
        {quota && (
          <div className="text-xs border-t border-border pt-2" data-testid="quota-info">
            Quota residua: <strong>{(capTotal - quota.used_credits).toFixed(2)}</strong>
            {" / "}
            {capTotal.toFixed(0)} ({quota.tier})
          </div>
        )}
        {overQuota && (
          <div
            className="text-xs text-error bg-error/10 border border-error/30 rounded px-2 py-1.5"
            data-testid="quota-exceeded-banner"
          >
            Quota esaurita: passa a un tier superiore per procedere.
          </div>
        )}
        <label className="flex items-center gap-2 text-xs text-ink-3 pt-1">
          <input
            type="checkbox"
            checked={skipCostPreview}
            onChange={(e) => setSkipCostPreview(e.target.checked)}
            data-testid="cost-skip-checkbox"
          />
          Non mostrare piu'
        </label>
      </div>
    </Dialog>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <>
      <div className="text-ink-3">{label}</div>
      <div className="font-mono text-ink">{value}</div>
    </>
  );
}
