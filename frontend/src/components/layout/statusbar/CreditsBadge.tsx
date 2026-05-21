/**
 * CreditsBadge (alpha.19) — Sprint 4 / Asse G4.
 *
 * Badge che mostra credits used/cap in StatusBar (es. "5/50 · 10%").
 * Carica i dati via react-query da `/api/billing/quota`. Cliccabile per
 * aprire l'AccountDialog (Usage tab).
 *
 * Stati visivi:
 *   - normal: text-ink-muted
 *   - >80%:   text-warn (avvicinarsi al cap)
 *   - >=100%: text-danger + bg-warn tint (cap esaurito)
 *
 * Hide se quota non disponibile (utente anonimo senza demo_user, errori
 * 401 ecc).
 */
import { useQuery } from "@tanstack/react-query";
import { Coins } from "lucide-react";

import { getQuota } from "../../../api/billing";
import { useAuthStore } from "../../../store/authStore";
import { Tooltip } from "../../ui/Tooltip";


interface Props {
  /** Click → callback (es. apri AccountDialog). */
  onClick?: () => void;
}


export function CreditsBadge({ onClick }: Props) {
  const authUser = useAuthStore((s) => s.user);
  // user_id: se loggato usa JWT.sub, altrimenti fallback demo_user
  const userId = authUser?.id ?? "demo_user";

  const { data, isError } = useQuery({
    queryKey: ["billing-quota", userId],
    queryFn: () => getQuota(userId),
    staleTime: 30_000, // 30s — non troppo aggressivo
    refetchInterval: 60_000, // 1min auto-refresh
    retry: 1,
  });

  if (isError || !data) return null;

  const totalCap = data.cap_credits + (data.bonus_credits ?? 0);
  const used = data.used_credits;
  const pct = totalCap > 0 ? (used / totalCap) * 100 : 0;

  const tone =
    pct >= 100 ? "danger" :
    pct >= 80  ? "warn"   :
    "normal";

  const colorClass =
    tone === "danger" ? "text-danger" :
    tone === "warn"   ? "text-warn"   :
    "text-ink-muted";

  return (
    <Tooltip
      content={
        <div>
          <div className="font-semibold flex items-center gap-1.5">
            Credits {data.tier}
            <span className={`chip text-[9px] ${tone === "danger" ? "chip-coral" : tone === "warn" ? "chip-warn" : "chip-info"}`}>
              {pct.toFixed(0)}%
            </span>
          </div>
          <div className="text-ink-muted text-[11px] mt-0.5">
            Usati {used.toFixed(2)} / cap {totalCap.toFixed(0)} (mese {data.month})
          </div>
          <div className="text-[10px] text-ink-dim mt-1">
            Click per dettagli usage
          </div>
        </div>
      }
    >
      <button
        type="button"
        onClick={onClick}
        data-testid="statusbar-credits"
        className={[
          "flex items-center gap-1.5 px-1.5 py-0.5 rounded text-[11px]",
          "hover:bg-bg-hover transition-colors",
          colorClass,
        ].join(" ")}
      >
        <Coins className="h-3 w-3" strokeWidth={1.8} />
        <span className="numeric">{used.toFixed(0)}/{totalCap.toFixed(0)}</span>
      </button>
    </Tooltip>
  );
}
