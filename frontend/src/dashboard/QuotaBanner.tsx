/**
 * QuotaBanner · Fetta E3.7 (redesign workspace-fasi)
 *
 * Banner sticky ambra sopra Dashboard, appare SOLO quando l'utente ha
 * usato >80% della quota Free. Decisione IA Dashboard #4 di Federico:
 * "Pagina dedicata /settings/billing + banner sticky solo se quota >80%".
 *
 * Replica mockup CD Round 2 sezione
 * `<div class="quota-banner" role="status">`. Stili in `dashboard-soft.css`.
 * Sticky `top: 48px` (sotto la topbar). Dismissibile per-sessione.
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, X } from "lucide-react";

export interface QuotaBannerProps {
  used: number;
  limit: number;
  /** Soglia decimale per mostrare il banner. Default 0.8 (80%). */
  threshold?: number;
}

export function QuotaBanner({ used, limit, threshold = 0.8 }: QuotaBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  // Hide se sotto soglia, se dismissed in questa sessione, o se quota
  // illimitata (limit = 0 oppure used/limit non significativo).
  if (limit <= 0) return null;
  const ratio = used / limit;
  if (ratio < threshold) return null;
  if (dismissed) return null;

  return (
    <div className="quota-banner" role="status" data-testid="dash-quota-banner">
      <div className="quota-inner">
        <AlertTriangle strokeWidth={2} aria-hidden />
        <span className="quota-msg">
          Piano Free quasi al limite —{" "}
          <span className="numeric">{used} / {limit}</span> modelli usati. Passa a Pro per modelli illimitati e job prioritari.
        </span>
        <span className="quota-spacer" />
        <Link
          to="/settings/billing"
          className="quota-cta"
          data-testid="dash-quota-cta"
        >
          Vedi fatturazione
        </Link>
        <button
          type="button"
          className="quota-dismiss"
          aria-label="Nascondi"
          onClick={() => setDismissed(true)}
          data-testid="dash-quota-dismiss"
        >
          <X strokeWidth={2} aria-hidden />
        </button>
      </div>
    </div>
  );
}
