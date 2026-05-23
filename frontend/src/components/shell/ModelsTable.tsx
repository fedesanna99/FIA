/**
 * ModelsTable (Precision v2.0) — A2 dashboard tabella modelli.
 *
 * Mockup A2 di handoff Claude Design. Tabella densa con thumbnail SVG,
 * sort sulle colonne, filter inline, empty state. Riusa Chip / Avatar / Kbd
 * dagli atoms — niente custom badge.
 *
 * Props stateless: passo `rows` già normalizzato (nome + counts + status
 * derivati a monte). `onSelect` riceve l'id del modello cliccato.
 *
 * Sort: stato interno (`sortBy`, `sortDir`). Default per "modifiedAt" desc.
 * Filter: stato interno (`query`). Match case-insensitive su name + owner.
 * Empty: `<EmptyState>` da atoms quando 0 risultati post-filter.
 *
 * Stili Precision:
 *   - Header sticky con eyebrow uppercase mono 10px wide-3
 *   - Row hover bg-bg-hover · cursor-pointer
 *   - Thumbnail SVG 40×24 wireframe (passato come prop `thumb`)
 *   - UC bar inline 70×4 con fill tonale (success/warn/danger)
 *   - Avatar 24×24 da atoms con name/tone derivata
 */
import { useMemo, useState } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown, Search } from "lucide-react";
import { Avatar, Chip, EmptyState, Input } from "../ui";
import { cn } from "../ui/cn";

export interface ModelTableRow {
  id: string;
  name: string;
  /** "2D" | "3D" | "section" | etc. */
  kind: string;
  nodes: number;
  elements: number;
  /** UC max post-solve (0..1+). Omesso = no-result. */
  ucMax?: number;
  status: "ok" | "run" | "draft" | "error";
  /** ISO date or pre-formatted string ("2h fa"). */
  modifiedAt: string;
  /** Display name; iniziali derivate. */
  ownerName?: string;
  /** Optional SVG markup as string OR React node. Sotto 200 chars consigliato. */
  thumb?: React.ReactNode;
}

interface Props {
  rows: readonly ModelTableRow[];
  onSelect?: (id: string) => void;
  onCreate?: () => void;
  className?: string;
}

type SortKey = "name" | "kind" | "nodes" | "ucMax" | "modifiedAt";
type SortDir = "asc" | "desc";

const STATUS_TONE: Record<ModelTableRow["status"], { tone: "success" | "info" | "neutral" | "danger"; label: string }> = {
  ok:    { tone: "success", label: "OK" },
  run:   { tone: "info",    label: "RUN" },
  draft: { tone: "neutral", label: "DRAFT" },
  error: { tone: "danger",  label: "ERR" },
};

function ucTone(uc: number): "success" | "warn" | "danger" {
  if (uc >= 1.0) return "danger";
  if (uc >= 0.85) return "warn";
  return "success";
}

export function ModelsTable({ rows, onSelect, onCreate, className }: Props) {
  const [sortBy, setSortBy] = useState<SortKey>("modifiedAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = !q
      ? [...rows]
      : rows.filter((r) =>
          r.name.toLowerCase().includes(q) ||
          (r.ownerName?.toLowerCase().includes(q) ?? false) ||
          r.kind.toLowerCase().includes(q),
        );
    out.sort((a, b) => {
      const va = a[sortBy] ?? "";
      const vb = b[sortBy] ?? "";
      const cmp = typeof va === "number" && typeof vb === "number"
        ? va - vb
        : String(va).localeCompare(String(vb));
      return sortDir === "asc" ? cmp : -cmp;
    });
    return out;
  }, [rows, query, sortBy, sortDir]);

  const toggleSort = (k: SortKey) => {
    if (sortBy === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortBy(k); setSortDir(k === "name" || k === "kind" ? "asc" : "desc"); }
  };

  if (rows.length === 0) {
    return (
      <EmptyState
        title="Nessun modello"
        description="Crea il primo modello da Studio Pro o importa da DXF/IFC."
        action={onCreate ? (
          <button
            type="button"
            onClick={onCreate}
            className="bg-accent text-white px-3.5 py-2 font-medium hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            Nuovo modello
          </button>
        ) : undefined}
      />
    );
  }

  return (
    <div className={cn("bg-bg-panel border border-border", className)} data-testid="models-table">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 px-3 py-2 border-b border-border">
        <div className="font-mono text-[10px] uppercase tracking-wide-3 text-ink-3">
          {filtered.length} <span className="text-ink-4">/</span> {rows.length} modelli
        </div>
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-3" strokeWidth={2} aria-hidden="true" />
          <Input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filtra per nome, autore, tipo…"
            className="pl-7 w-64 font-mono text-xs"
            data-testid="models-filter"
            aria-label="Filtra modelli"
          />
        </div>
      </div>

      {/* Table */}
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-border bg-bg">
            <Th sortable active={sortBy === "name"}      dir={sortDir} onClick={() => toggleSort("name")}>Modello</Th>
            <Th sortable active={sortBy === "kind"}      dir={sortDir} onClick={() => toggleSort("kind")}>Tipo</Th>
            <Th sortable active={sortBy === "nodes"}     dir={sortDir} onClick={() => toggleSort("nodes")} align="right">Counts</Th>
            <Th sortable active={sortBy === "ucMax"}     dir={sortDir} onClick={() => toggleSort("ucMax")} align="right">UC max</Th>
            <Th>Status</Th>
            <Th sortable active={sortBy === "modifiedAt"} dir={sortDir} onClick={() => toggleSort("modifiedAt")}>Modificato</Th>
            <Th>Autore</Th>
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-3 py-6 text-center text-sm text-ink-3 font-mono">
                Nessun risultato per &quot;{query}&quot;.
              </td>
            </tr>
          ) : (
            filtered.map((r) => {
              const statusMeta = STATUS_TONE[r.status];
              return (
                <tr
                  key={r.id}
                  onClick={() => onSelect?.(r.id)}
                  className="border-b border-border last:border-b-0 hover:bg-bg-hover cursor-pointer transition-colors duration-fast"
                  data-testid={`models-row-${r.id}`}
                >
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-6 bg-bg-viewport border border-border flex-shrink-0 overflow-hidden" aria-hidden="true">
                        {r.thumb}
                      </div>
                      <div className="min-w-0">
                        <div className="text-base font-medium text-ink truncate">{r.name}</div>
                        <div className="font-mono text-[10px] text-ink-3">{r.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <Chip tone="neutral">{r.kind}</Chip>
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs tabular-nums text-ink-2">
                    {r.nodes} <span className="text-ink-3">N</span> · {r.elements} <span className="text-ink-3">E</span>
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs tabular-nums">
                    {r.ucMax !== undefined ? (
                      <span className="inline-flex items-center gap-2">
                        <UcBar value={r.ucMax} />
                        <span className={cn(
                          "font-semibold",
                          ucTone(r.ucMax) === "danger" && "text-danger",
                          ucTone(r.ucMax) === "warn"   && "text-warn",
                          ucTone(r.ucMax) === "success" && "text-success",
                        )}>{r.ucMax.toFixed(2)}</span>
                      </span>
                    ) : (
                      <span className="text-ink-4">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <Chip tone={statusMeta.tone} dot>{statusMeta.label}</Chip>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs text-ink-2 tabular-nums">{r.modifiedAt}</td>
                  <td className="px-3 py-2.5">
                    {r.ownerName && <Avatar name={r.ownerName} size="sm" />}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

interface ThProps {
  children: React.ReactNode;
  sortable?: boolean;
  active?: boolean;
  dir?: SortDir;
  align?: "left" | "right";
  onClick?: () => void;
}

function Th({ children, sortable, active, dir, align = "left", onClick }: ThProps) {
  const Icon = !active ? ArrowUpDown : dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <th
      scope="col"
      className={cn(
        "px-3 py-2 font-mono text-[10px] uppercase tracking-wide-3 font-medium text-ink-3 select-none",
        align === "right" ? "text-right" : "text-left",
        sortable && "cursor-pointer hover:text-ink-2",
        active && "text-accent",
      )}
      onClick={sortable ? onClick : undefined}
      aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : undefined}
    >
      <span className={cn("inline-flex items-center gap-1", align === "right" && "flex-row-reverse")}>
        {children}
        {sortable && <Icon className="w-3 h-3" strokeWidth={2} aria-hidden="true" />}
      </span>
    </th>
  );
}

function UcBar({ value }: { value: number }) {
  const tone = ucTone(value);
  return (
    <span
      className="inline-block w-[70px] h-1 bg-bg-hover border border-border relative align-middle"
      aria-hidden="true"
    >
      <span
        className={cn(
          "absolute inset-y-0 left-0",
          tone === "danger" && "bg-danger",
          tone === "warn"   && "bg-warn",
          tone === "success" && "bg-success",
        )}
        style={{ width: `${Math.min(value, 1) * 100}%` }}
      />
    </span>
  );
}
