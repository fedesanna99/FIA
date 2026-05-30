/**
 * StepConfirm · v3.5 Fetta D6 (30/05/2026)
 *
 * Pattern riusabile per gli step 2-3 del Percorso (Vincoli/Carichi +
 * Materiali/Sezioni) che mostrano una CONFIGURAZIONE PRE-IMPOSTATA dal
 * template (D3 buildFrameModel + future fette backend) e chiedono solo
 * conferma per procedere.
 *
 * Layout interno 2-col:
 *   - LEFT: riepilogo cards (label/valore/icona) + tip didattica + CTA confirm
 *   - RIGHT: aside "About this step" + eventuali alternative preset
 *
 * Pattern molto piu' leggero di StepGeometry (D3): no form parametrico,
 * solo display + conferma. Il backend reale sara' cablato D7 (per ora
 * la conferma e' visiva + avanza step).
 *
 * Usato da step 2 e 3 del Percorso Telaio 2D — config diversa, layout
 * stesso. Esteso per step 4-6 (Esegui/Critical/Report) in D7.
 */
import { ReactNode } from "react";
import { Lightbulb, type LucideIcon } from "lucide-react";


export interface StepConfirmItem {
  /** Icona Lucide per riconoscimento veloce. */
  icon: LucideIcon;
  /** Label corta (es. "Vincoli base"). */
  label: string;
  /** Valore mostrato accanto (es. "2 incastri", "10 kN/m"). */
  value: string;
  /** Nota piccola di contesto sotto (opzionale). */
  hint?: string;
}


interface Props {
  /** CTA label (es. "Conferma vincoli e carichi"). */
  ctaLabel: string;
  /** Items mostrati nel riepilogo a sinistra. */
  items: StepConfirmItem[];
  /** Tip didattica (giallo, sotto i items). */
  tip?: string;
  /** About step: descrive a parole cosa fa lo step. */
  aboutTitle?: string;
  aboutBody?: ReactNode;
  /** Hint chip a sinistra del CTA (es. "Default sicuro · personalizzabile dopo"). */
  ctaHint?: string;
  /** Callback al click CTA. */
  onConfirm: () => void;
}


export function StepConfirm({
  ctaLabel,
  items,
  tip,
  aboutTitle = "ABOUT THIS STEP",
  aboutBody,
  ctaHint,
  onConfirm,
}: Props) {
  return (
    <div className="ptd-confirm-body" data-testid="step-confirm-body">
      {/* ── LEFT · riepilogo items + tip + CTA confirm ── */}
      <div className="ptd-confirm-main">
        <ul className="ptd-confirm-items" role="list">
          {items.map((item, i) => {
            const Icon = item.icon;
            return (
              <li
                key={i}
                className="ptd-confirm-item"
                data-testid={`step-confirm-item-${i}`}
              >
                <div className="ptd-confirm-item-icon">
                  <Icon size={16} strokeWidth={1.8} aria-hidden />
                </div>
                <div className="ptd-confirm-item-text">
                  <div className="ptd-confirm-item-label">{item.label}</div>
                  <div className="ptd-confirm-item-value">{item.value}</div>
                  {item.hint && (
                    <div className="ptd-confirm-item-hint">{item.hint}</div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        {tip && (
          <div className="ptd-confirm-tip" data-testid="step-confirm-tip">
            <Lightbulb size={14} strokeWidth={1.8} aria-hidden />
            <p>{tip}</p>
          </div>
        )}

        <div className="ptd-confirm-cta-row">
          {ctaHint && (
            <span className="ptd-confirm-cta-hint">{ctaHint}</span>
          )}
          <button
            type="button"
            className="ptd-confirm-cta"
            onClick={onConfirm}
            data-testid="step-confirm-cta"
          >
            {ctaLabel}
          </button>
        </div>
      </div>

      {/* ── RIGHT · about step aside ── */}
      <aside className="ptd-confirm-aside" data-testid="step-confirm-aside">
        <div className="ptd-confirm-aside-eyebrow">{aboutTitle}</div>
        <div className="ptd-confirm-aside-body">{aboutBody}</div>
      </aside>
    </div>
  );
}
