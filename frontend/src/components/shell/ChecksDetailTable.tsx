/**
 * ChecksDetailTable (Precision v2.0) — B3 detail panel per verifica selezionata.
 *
 * Tabella element-by-element del check corrente (es. "EC3 §6.2.5 · Flessione").
 * Per ogni element mostra: id, sezione, sforzi (N, V, M), UC ratio con bar
 * inline, status pass/warn/fail. La riga con UC > 1 (o UC max) viene
 * marcata `is-critical` con border-left danger.
 *
 * Animations:
 *   - Mount: `animate-fade-in` (120ms) quando il `checkId` cambia → switch
 *     percettivo fra checks
 *   - Critical row: animate-pulse sul border-left per ~2s al primo mount
 *     (focus l'attenzione, poi si ferma → no jitter cronico)
 *   - UC bar: `transition-all duration-mid` su width → si "riempie" quando
 *     i valori cambiano
 *
 * Stateless: il consumer passa già le righe filtrate per il check corrente.
 */
import { useEffect, useState } from "react";
import { Chip } from "../ui";
import { cn } from "../ui/cn";

export interface CheckRow {
  /** Es. "B1", "B5", "shell-12". */
  elementId: string;
  /** Es. "HEA 200", "C25/30 · IPE 240". */
  section: string;
  /** Sforzi normalizzati (può lasciare undefined per i check che non li usano). */
  forces?: { N?: number; V?: number; M?: number };
  /** UC ratio. > 1 = critico. */
  uc: number;
  /** Note libere (es. "buckling controlled"). */
  note?: string;
}

interface Props {
  /** ID del check corrente — usato per re-mount delle animazioni. */
  checkId: string;
  /** Titolo della verifica (es. "EC3 §6.2.5 · Resistenza flessionale"). */
  title: string;
  /** Sottotitolo opzionale (es. "I-section · cl. 1"). */
  subtitle?: string;
  rows: readonly CheckRow[];
  /** UC limite (default 1.0). */
  ucLimit?: number;
  className?: string;
}

function ucTone(uc: number, limit: number): "success" | "warn" | "danger" {
  if (uc >= limit) return "danger";
  if (uc >= limit * 0.85) return "warn";
  return "success";
}

export function ChecksDetailTable({ checkId, title, subtitle, rows, ucLimit = 1.0, className }: Props) {
  // Animation key — quando `checkId` cambia, ri-monto le righe.
  const [criticalPulse, setCriticalPulse] = useState(true);
  useEffect(() => {
    setCriticalPulse(true);
    const t = setTimeout(() => setCriticalPulse(false), 2000);
    return () => clearTimeout(t);
  }, [checkId]);

  const maxUc = rows.reduce((m, r) => Math.max(m, r.uc), 0);

  return (
    <section
      key={checkId}
      className={cn(
        "bg-bg-panel border border-border animate-fade-in min-w-0",
        className,
      )}
      data-testid="checks-detail-table"
    >
      {/* Header */}
      <header className="px-3 sm:px-4 py-3 border-b border-border">
        <h3 className="font-display text-base sm:text-lg font-semibold tracking-tight-1 text-ink break-words">{title}</h3>
        {subtitle && <p className="font-mono text-[11px] sm:text-xs text-ink-3 mt-0.5 break-words">{subtitle}</p>}
        {/* v2.1.5 mobile-fix: flex-wrap così "UC max" + "UC limite" vanno a capo
            invece di sforare lateralmente sui mobile stretti. */}
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] text-ink-3">
          <span><span className="text-ink-2">{rows.length}</span> elementi</span>
          <span>UC max <span className={cn(
            "font-semibold tabular-nums",
            ucTone(maxUc, ucLimit) === "danger" && "text-danger",
            ucTone(maxUc, ucLimit) === "warn"   && "text-warn",
            ucTone(maxUc, ucLimit) === "success" && "text-success",
          )}>{maxUc.toFixed(2)}</span></span>
          <span>UC limite {ucLimit.toFixed(2)}</span>
        </div>
      </header>

      {/* Table — wrapped in scroll container so 7 colonne non spingono il
          pannello fuori dal viewport mobile 375px. Mobile: l'utente scrolla
          orizzontalmente nella tabella mentre il pannello resta fixed. */}
      <div className="overflow-x-auto -mx-px">
      <table className="w-full min-w-[560px] border-collapse">
        <thead>
          <tr className="bg-bg border-b border-border">
            <Th>Elemento</Th>
            <Th>Sezione</Th>
            <Th align="right">N (kN)</Th>
            <Th align="right">V (kN)</Th>
            <Th align="right">M (kNm)</Th>
            <Th align="right" className="w-[140px]">UC</Th>
            <Th>Status</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const tone = ucTone(r.uc, ucLimit);
            const isCritical = r.uc >= ucLimit;
            return (
              <tr
                key={r.elementId}
                className={cn(
                  "border-b border-border last:border-b-0 transition-colors duration-fast",
                  "hover:bg-bg-hover",
                  isCritical && "border-l-2 border-l-danger",
                  isCritical && criticalPulse && "animate-pulse",
                )}
                data-testid={`check-row-${r.elementId}`}
                data-critical={isCritical || undefined}
              >
                <td className="px-3 py-2 font-mono text-xs font-semibold text-ink tabular-nums">{r.elementId}</td>
                <td className="px-3 py-2 font-mono text-xs text-ink-2">{r.section}</td>
                <td className="px-3 py-2 text-right font-mono text-xs tabular-nums text-ink-2">
                  {r.forces?.N !== undefined ? r.forces.N.toFixed(1) : "—"}
                </td>
                <td className="px-3 py-2 text-right font-mono text-xs tabular-nums text-ink-2">
                  {r.forces?.V !== undefined ? r.forces.V.toFixed(1) : "—"}
                </td>
                <td className="px-3 py-2 text-right font-mono text-xs tabular-nums text-ink-2">
                  {r.forces?.M !== undefined ? r.forces.M.toFixed(1) : "—"}
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center justify-end gap-2">
                    <UcBar value={r.uc} limit={ucLimit} />
                    <span className={cn(
                      "font-mono text-xs font-semibold tabular-nums min-w-[3ch] text-right",
                      tone === "danger" && "text-danger",
                      tone === "warn"   && "text-warn",
                      tone === "success" && "text-success",
                    )}>{r.uc.toFixed(2)}</span>
                  </div>
                </td>
                <td className="px-3 py-2">
                  <Chip tone={tone} dot>
                    {tone === "danger" ? "Fail" : tone === "warn" ? "Attenzione" : "OK"}
                  </Chip>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </section>
  );
}

function Th({ children, align = "left", className }: { children: React.ReactNode; align?: "left" | "right"; className?: string }) {
  return (
    <th
      scope="col"
      className={cn(
        "px-3 py-2 font-mono text-[10px] uppercase tracking-wide-3 font-medium text-ink-3 select-none",
        align === "right" ? "text-right" : "text-left",
        className,
      )}
    >
      {children}
    </th>
  );
}

function UcBar({ value, limit }: { value: number; limit: number }) {
  const tone = ucTone(value, limit);
  // Normalizziamo su limit per leggere il riempimento come % del max ammesso.
  const fill = Math.min(value / limit, 1.2);
  return (
    <span className="inline-block w-[80px] h-1 bg-bg-hover border border-border relative" aria-hidden="true">
      <span
        className={cn(
          "absolute inset-y-0 left-0 transition-all duration-mid ease-decelerate",
          tone === "danger" && "bg-danger",
          tone === "warn"   && "bg-warn",
          tone === "success" && "bg-success",
        )}
        style={{ width: `${Math.min(fill * 100, 100)}%` }}
      />
      {/* Mark del limit */}
      <span
        aria-hidden="true"
        className="absolute top-[-2px] bottom-[-2px] w-px bg-ink-3"
        style={{ left: "calc(100% - 1px)" }}
      />
    </span>
  );
}
