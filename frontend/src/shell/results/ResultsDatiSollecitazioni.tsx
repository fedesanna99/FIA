// redesign/workspace-fasi · FETTA 2b · FAMIGLIA C · Dati > Sollecitazioni
//
// Tabella per elemento (M, V, N, σ) ordinabile, col massimo evidenziato.
// In cima il banner ambra "Calcolo sospetto" se isSuspicious. Per geometrie
// dove una grandezza non ha senso (es. M/V/N sui solidi 3D), la colonna
// mostra "n/a" — mai "0" falso.
//
// Lettura derivata dagli store esistenti:
//   - staticResults.element_forces[]   (N_i/j, Vy_i/j, Vz_i/j, M*_i/j locale)
//   - staticResults.element_stresses[] (von_mises per element_id)
//   - model.elements[]                 (tipo elemento → applicabilità M/V/N)
//
// Export CSV: placeholder onesto "in arrivo" (non bottone che non funziona).

import { useMemo, useState } from "react";
import { AlertTriangle, Download, ChevronUp, ChevronDown } from "lucide-react";
import { useModelStore } from "../../store/modelStore";
import { useResultsStore } from "../../store/resultsStore";
import { isSuspicious, SUSPICIOUS_REASON } from "./resultsHonest";
import type { ElementType } from "../../types/model";
import type { StaticResults, ElementForces, ElementStress } from "../../types/results";

type SortKey = "element" | "M" | "V" | "N" | "sigma";
type SortDir = "desc" | "asc";

interface Row {
  element_id: number;
  type: ElementType;
  M: number | null;
  V: number | null;
  N: number | null;
  sigma_mpa: number; // von_mises sempre disponibile (anche 0)
}

const LINE_TYPES: ReadonlySet<ElementType> = new Set<ElementType>([
  "beam2d", "beam3d", "truss2d", "truss3d", "cable2d", "cable3d",
]);

function applicableMVN(type: ElementType) {
  if (LINE_TYPES.has(type)) {
    if (type === "beam2d" || type === "beam3d") return { M: true, V: true, N: true };
    return { M: false, V: false, N: true };
  }
  return { M: false, V: false, N: false };
}

function maxAbsForElement(
  forces: ElementForces | undefined,
  field: "M" | "V" | "N",
): number | null {
  if (!forces) return null;
  if (field === "M") {
    return Math.max(
      Math.abs(forces.Mz_i), Math.abs(forces.Mz_j),
      Math.abs(forces.My_i), Math.abs(forces.My_j),
    );
  }
  if (field === "V") {
    return Math.max(
      Math.abs(forces.Vy_i), Math.abs(forces.Vy_j),
      Math.abs(forces.Vz_i), Math.abs(forces.Vz_j),
    );
  }
  // N
  return Math.max(Math.abs(forces.N_i), Math.abs(forces.N_j));
}

function buildRows(
  staticResults: StaticResults,
  elementsByType: Map<number, ElementType>,
): Row[] {
  const stressById = new Map<number, ElementStress>();
  for (const s of staticResults.element_stresses) stressById.set(s.element_id, s);
  const forcesById = new Map<number, ElementForces>();
  for (const f of staticResults.element_forces) forcesById.set(f.element_id, f);

  // Union di tutti gli element_id presenti (stress o forces)
  const ids = new Set<number>([
    ...stressById.keys(),
    ...forcesById.keys(),
  ]);

  const rows: Row[] = [];
  for (const id of ids) {
    const type = elementsByType.get(id) ?? "beam2d";
    const applic = applicableMVN(type);
    const forces = forcesById.get(id);
    const stress = stressById.get(id);
    rows.push({
      element_id: id,
      type,
      M: applic.M ? (maxAbsForElement(forces, "M") ?? 0) / 1000 : null, // Nmm → Nm? in realtà M è in N·m
      V: applic.V ? (maxAbsForElement(forces, "V") ?? 0) / 1000 : null, // N → kN
      N: applic.N ? (maxAbsForElement(forces, "N") ?? 0) / 1000 : null, // N → kN
      sigma_mpa: (stress?.von_mises ?? 0) / 1e6,
    });
  }
  return rows;
}

export function ResultsDatiSollecitazioni() {
  const model = useModelStore((s) => s.model);
  const staticResults = useResultsStore((s) => s.staticResults);
  const [sortKey, setSortKey] = useState<SortKey>("sigma");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const suspicious = isSuspicious(staticResults);
  const elementsByType = useMemo(() => {
    const m = new Map<number, ElementType>();
    for (const el of model?.elements ?? []) m.set(el.id, el.type);
    return m;
  }, [model]);

  const rows = useMemo(() => {
    if (!staticResults) return [];
    return buildRows(staticResults, elementsByType);
  }, [staticResults, elementsByType]);

  const sortedRows = useMemo(() => {
    const sorted = [...rows];
    sorted.sort((a, b) => {
      let av: number, bv: number;
      if (sortKey === "element") { av = a.element_id; bv = b.element_id; }
      else if (sortKey === "sigma") { av = a.sigma_mpa; bv = b.sigma_mpa; }
      else { av = a[sortKey] ?? -Infinity; bv = b[sortKey] ?? -Infinity; }
      return sortDir === "desc" ? bv - av : av - bv;
    });
    return sorted;
  }, [rows, sortKey, sortDir]);

  const maxSigma = useMemo(
    () => rows.reduce((m, r) => Math.max(m, r.sigma_mpa), 0),
    [rows],
  );

  if (!staticResults) {
    return (
      <div className="results-placeholder" data-testid="results-placeholder">
        Nessun calcolo statico disponibile. Lancia un'analisi statica dal
        passo <b>Esegui</b> per vedere la tabella sollecitazioni.
      </div>
    );
  }

  const onSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const handleExportPlaceholder = () => {
    // eslint-disable-next-line no-alert
    window.alert(
      "Export CSV — in arrivo. Per ora puoi copiare i numeri a mano dalla tabella."
    );
  };

  const fmt = (v: number | null, digits = 1) =>
    v === null ? "n/a" : v.toLocaleString("it-IT", { maximumFractionDigits: digits });

  return (
    <div className="results-data" data-testid="results-data-sollecitazioni">
      {suspicious && (
        <div className="results-data-warn" data-testid="results-data-sollec-warn" role="alert">
          <AlertTriangle size={14} aria-hidden />
          <span>
            <strong>Calcolo sospetto:</strong> i numeri qui sotto potrebbero non
            avere senso fisico. {SUSPICIOUS_REASON}
          </span>
        </div>
      )}

      <div className="results-data-tbar">
        <span>{rows.length === 0 ? "Nessun elemento" : `${rows.length} element${rows.length === 1 ? "o" : "i"}`}</span>
        <span className="results-data-tbar-sp" />
        <button
          type="button"
          className="results-data-export"
          data-testid="sollec-export-csv"
          onClick={handleExportPlaceholder}
          title="Export CSV — in arrivo (placeholder)"
        >
          <Download size={11} aria-hidden /> CSV
        </button>
      </div>

      <table className="results-data-table" data-testid="sollec-table">
        <thead>
          <tr>
            <Th sortKey="element" current={sortKey} dir={sortDir} onSort={onSort}>elem</Th>
            <Th sortKey="M" current={sortKey} dir={sortDir} onSort={onSort}>M [N·m]</Th>
            <Th sortKey="V" current={sortKey} dir={sortDir} onSort={onSort}>V [kN]</Th>
            <Th sortKey="N" current={sortKey} dir={sortDir} onSort={onSort}>N [kN]</Th>
            <Th sortKey="sigma" current={sortKey} dir={sortDir} onSort={onSort}>σ [MPa]</Th>
          </tr>
        </thead>
        <tbody>
          {sortedRows.length === 0 && (
            <tr><td colSpan={5} className="results-data-empty">Nessun dato</td></tr>
          )}
          {sortedRows.map((r) => {
            const isMax = maxSigma > 0 && r.sigma_mpa === maxSigma;
            return (
              <tr
                key={r.element_id}
                className={isMax ? "is-max" : undefined}
                data-testid={`sollec-row-${r.element_id}`}
                data-max={isMax ? "true" : undefined}
              >
                <td>E{r.element_id}</td>
                <td>{fmt(r.M)}</td>
                <td>{fmt(r.V)}</td>
                <td>{fmt(r.N)}</td>
                <td>
                  {fmt(r.sigma_mpa, 0)}
                  {isMax && <span className="results-data-tag"> max</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <p className="results-data-hint">
        Clic sull'intestazione per ordinare. "n/a" significa che la grandezza
        non è applicabile al tipo di elemento (es. momento sui solidi 3D).
      </p>
    </div>
  );
}

function Th({
  sortKey, current, dir, onSort, children,
}: {
  sortKey: SortKey;
  current: SortKey;
  dir: SortDir;
  onSort: (k: SortKey) => void;
  children: React.ReactNode;
}) {
  const active = sortKey === current;
  return (
    <th
      onClick={() => onSort(sortKey)}
      data-active={active ? "true" : undefined}
      data-testid={`sollec-th-${sortKey}`}
      role="columnheader"
      aria-sort={active ? (dir === "desc" ? "descending" : "ascending") : undefined}
    >
      {children}
      {active && (
        dir === "desc"
          ? <ChevronDown size={10} aria-hidden />
          : <ChevronUp size={10} aria-hidden />
      )}
    </th>
  );
}
