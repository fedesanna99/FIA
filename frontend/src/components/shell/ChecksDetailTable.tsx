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

/**
 * v2.6.4 B.2: element type per header dinamico (vedi b3-checks-content-spec.md).
 *   - beam2D: N | V | M (default)
 *   - beam3D: N | Vy | Vz | My | Mz | T
 *   - shell:  σ_x_top | σ_y_top | τ_xy | σ_VM
 *   - solid:  σ_x | σ_y | σ_z | τ_xy | σ_VM
 *   - truss:  N only
 */
export type ChecksElementType = "beam2D" | "beam3D" | "shell" | "solid" | "truss";

export interface CheckRow {
  /** Es. "B1", "B5", "shell-12". */
  elementId: string;
  /** Es. "HEA 200", "C25/30 · IPE 240". */
  section: string;
  /** Sforzi normalizzati (può lasciare undefined per i check che non li usano).
   *  Per beam2D: usa N/V/M scalari. Per beam3D: usa N/Vy/Vz/My/Mz/T. */
  forces?: {
    N?: number;
    V?: number;   // alias per Vy in beam2D
    M?: number;   // alias per Mz in beam2D
    Vy?: number;
    Vz?: number;
    My?: number;
    Mz?: number;
    T?: number;   // torsione (beam3D only)
  };
  /** v2.6.4 B.2: tensioni per shell/solid (MPa). */
  stresses?: {
    sigmaX?: number;
    sigmaY?: number;
    sigmaZ?: number;
    sigmaXTop?: number;   // shell: fibra superiore
    sigmaYTop?: number;
    tauXY?: number;
    sigmaVM?: number;      // Von Mises equivalent
  };
  /** v2.6.4 B.2: spessore shell (mm). */
  thickness?: number;
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
  /**
   * v2.6.4 B.2: tipo elemento prevalente per header dinamico. Default "beam2D"
   * per backward compat con consumer pre-v2.6.4 (es. VerifyChecksLive).
   */
  elementType?: ChecksElementType;
}

// v2.6.4 B.2: column definitions per element type (vedi b3 § 2).
interface ColumnDef {
  key: string;
  label: string;
  suffix?: string;
  align?: "left" | "right";
  width?: string;
  /** Render value da CheckRow (undefined → "—"). */
  value: (r: CheckRow) => number | undefined;
}

const FORCE_COLS: Record<ChecksElementType, ColumnDef[]> = {
  beam2D: [
    { key: "N", label: "N",  suffix: "kN",  align: "right", value: (r) => r.forces?.N },
    { key: "V", label: "V",  suffix: "kN",  align: "right", value: (r) => r.forces?.V ?? r.forces?.Vy },
    { key: "M", label: "M",  suffix: "kNm", align: "right", value: (r) => r.forces?.M ?? r.forces?.Mz },
  ],
  beam3D: [
    { key: "N",  label: "N",  suffix: "kN",  align: "right", value: (r) => r.forces?.N },
    { key: "Vy", label: "Vy", suffix: "kN",  align: "right", value: (r) => r.forces?.Vy },
    { key: "Vz", label: "Vz", suffix: "kN",  align: "right", value: (r) => r.forces?.Vz },
    { key: "My", label: "My", suffix: "kNm", align: "right", value: (r) => r.forces?.My },
    { key: "Mz", label: "Mz", suffix: "kNm", align: "right", value: (r) => r.forces?.Mz },
    { key: "T",  label: "T",  suffix: "kNm", align: "right", value: (r) => r.forces?.T },
  ],
  shell: [
    { key: "sigmaXTop", label: "σ_x_top", suffix: "MPa", align: "right", value: (r) => r.stresses?.sigmaXTop },
    { key: "sigmaYTop", label: "σ_y_top", suffix: "MPa", align: "right", value: (r) => r.stresses?.sigmaYTop },
    { key: "tauXY",     label: "τ_xy",    suffix: "MPa", align: "right", value: (r) => r.stresses?.tauXY },
    { key: "sigmaVM",   label: "σ_VM",    suffix: "MPa", align: "right", value: (r) => r.stresses?.sigmaVM },
  ],
  solid: [
    { key: "sigmaX",  label: "σ_x",  suffix: "MPa", align: "right", value: (r) => r.stresses?.sigmaX },
    { key: "sigmaY",  label: "σ_y",  suffix: "MPa", align: "right", value: (r) => r.stresses?.sigmaY },
    { key: "sigmaZ",  label: "σ_z",  suffix: "MPa", align: "right", value: (r) => r.stresses?.sigmaZ },
    { key: "tauXY",   label: "τ_xy", suffix: "MPa", align: "right", value: (r) => r.stresses?.tauXY },
    { key: "sigmaVM", label: "σ_VM", suffix: "MPa", align: "right", value: (r) => r.stresses?.sigmaVM },
  ],
  truss: [
    { key: "N", label: "N", suffix: "kN", align: "right", value: (r) => r.forces?.N },
  ],
};

/** v2.6.4 B.2: prima colonna varia per shell (Spessore invece di Sezione). */
function firstCol(type: ChecksElementType): { label: string; suffix?: string; value: (r: CheckRow) => string } {
  if (type === "shell") {
    return {
      label: "Spessore",
      suffix: "mm",
      value: (r) => (r.thickness !== undefined ? r.thickness.toFixed(1) : r.section),
    };
  }
  if (type === "solid") {
    // Solid: skip "Sezione" intermedia, l'elemento ID basta. Mostriamo
    // comunque la sezione per coerenza con beam (mat/cl. specifica).
    return { label: "Sezione", value: (r) => r.section };
  }
  return { label: "Sezione", value: (r) => r.section };
}

function ucTone(uc: number, limit: number): "success" | "warn" | "danger" {
  if (uc >= limit) return "danger";
  if (uc >= limit * 0.85) return "warn";
  return "success";
}

export function ChecksDetailTable({
  checkId,
  title,
  subtitle,
  rows,
  ucLimit = 1.0,
  className,
  elementType = "beam2D",
}: Props) {
  // Animation key — quando `checkId` cambia, ri-monto le righe.
  const [criticalPulse, setCriticalPulse] = useState(true);
  useEffect(() => {
    setCriticalPulse(true);
    const t = setTimeout(() => setCriticalPulse(false), 2000);
    return () => clearTimeout(t);
  }, [checkId]);

  const maxUc = rows.reduce((m, r) => Math.max(m, r.uc), 0);

  // v2.6.4 B.2: column definitions dinamiche per element type prevalente.
  const forceCols = FORCE_COLS[elementType];
  const firstColDef = firstCol(elementType);

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

      {/* Table — wrapped in scroll container so le colonne non spingono il
          pannello fuori dal viewport mobile 375px. v2.6.4 B.2: numero
          di colonne varia per element type (3 force per beam2D fino a 6 per
          beam3D); min-width scala di conseguenza. */}
      <div className="overflow-x-auto -mx-px">
      <table className={cn(
        "w-full border-collapse",
        elementType === "beam3D" ? "min-w-[720px]" : "min-w-[560px]",
      )}>
        <thead>
          <tr className="bg-bg border-b border-border" data-element-type={elementType}>
            <Th>Elemento</Th>
            <Th>{firstColDef.label}{firstColDef.suffix ? ` (${firstColDef.suffix})` : ""}</Th>
            {forceCols.map((col) => (
              <Th key={col.key} align={col.align}>
                {col.label}{col.suffix ? ` (${col.suffix})` : ""}
              </Th>
            ))}
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
                <td className="px-3 py-2 font-mono text-xs text-ink-2">{firstColDef.value(r)}</td>
                {forceCols.map((col) => {
                  const v = col.value(r);
                  return (
                    <td
                      key={col.key}
                      className="px-3 py-2 text-right font-mono text-xs tabular-nums text-ink-2"
                    >
                      {v !== undefined ? v.toFixed(1) : "—"}
                    </td>
                  );
                })}
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
