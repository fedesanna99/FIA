// redesign/workspace-fasi · FETTA 2b · FAMIGLIA C · Dati > Reazioni
//
// Tabella reazioni vincolari per nodo vincolato (Rx, Ry, Rz e Mx/My/Mz
// dove applicabili) + riga finale "Σ reazioni" / "Σ carichi applicati" /
// "Δ equilibrio". E' il "primo controllo a mano" del senior — il delta
// deve essere ≈0 in equilibrio.
//
// In cima banner sospetto se isSuspicious(). Mai bugie: per modelli senza
// momenti (es. truss puro), le colonne Mx/My/Mz mostrano "n/a".
//
// Lettura derivata:
//   - staticResults.reactions[]   (per node_id, fx/fy/fz, mx/my/mz)
//   - model.loads[]                (per somma forze applicate)
//   - model.elements[]             (per scoprire se ci sono beam → momenti)
//   - model.constraints[]          (per filtrare i nodi vincolati)

import { useMemo } from "react";
import { AlertTriangle } from "lucide-react";
import { useModelStore } from "../../store/modelStore";
import { useResultsStore } from "../../store/resultsStore";
import { isSuspicious, SUSPICIOUS_REASON } from "./resultsHonest";
import type { FEAModel, ElementType } from "../../types/model";
import type { NodalReaction } from "../../types/results";

interface ReactionRow {
  node_id: number;
  fx: number; fy: number; fz: number;
  mx: number; my: number; mz: number;
}

function modelHasMoments(model: FEAModel | null): boolean {
  if (!model || !model.elements) return false;
  const MOMENT_TYPES: ReadonlySet<ElementType> = new Set<ElementType>([
    "beam2d", "beam3d", "shell_q4", "shell_q4_mitc",
  ]);
  return model.elements.some((el) => MOMENT_TYPES.has(el.type));
}

function buildReactionRows(
  reactions: NodalReaction[],
  constraintNodeIds: Set<number>,
): ReactionRow[] {
  return reactions
    .filter((r) => constraintNodeIds.has(r.node_id))
    .map((r) => ({
      node_id: r.node_id,
      fx: r.fx, fy: r.fy, fz: r.fz,
      mx: r.mx, my: r.my, mz: r.mz,
    }))
    .sort((a, b) => a.node_id - b.node_id);
}

function sumLoads(model: FEAModel | null): { fx: number; fy: number; fz: number } {
  if (!model || !model.loads) return { fx: 0, fy: 0, fz: 0 };
  let fx = 0, fy = 0, fz = 0;
  for (const l of model.loads) {
    if (l.type === "nodal") {
      fx += l.fx ?? 0;
      fy += l.fy ?? 0;
      fz += l.fz ?? 0;
    }
    // distributed/pressure/self_weight: difficile aggregare onestamente
    // qui (richiedono lunghezza/area/volume × peso). Step C ignora per
    // ora (placeholder onesto sotto). Step futuro potra' aggiungerli.
  }
  return { fx, fy, fz };
}

export function ResultsDatiReazioni() {
  const model = useModelStore((s) => s.model);
  const staticResults = useResultsStore((s) => s.staticResults);
  const suspicious = isSuspicious(staticResults);
  const hasMoments = modelHasMoments(model);

  const constraintNodeIds = useMemo(() => {
    const s = new Set<number>();
    for (const c of model?.constraints ?? []) s.add(c.node_id);
    return s;
  }, [model]);

  const rows = useMemo(() => {
    if (!staticResults) return [];
    return buildReactionRows(staticResults.reactions, constraintNodeIds);
  }, [staticResults, constraintNodeIds]);

  const sumReactions = useMemo(() => {
    let fx = 0, fy = 0, fz = 0;
    for (const r of rows) {
      fx += r.fx; fy += r.fy; fz += r.fz;
    }
    return { fx, fy, fz };
  }, [rows]);

  const sumApplied = useMemo(() => sumLoads(model), [model]);

  // Delta = ΣR + ΣF (Σ esterne, vincoli reagiscono OPPOSTO ai carichi)
  const delta = {
    fx: sumReactions.fx + sumApplied.fx,
    fy: sumReactions.fy + sumApplied.fy,
    fz: sumReactions.fz + sumApplied.fz,
  };
  const deltaMag = Math.sqrt(delta.fx ** 2 + delta.fy ** 2 + delta.fz ** 2);
  const appliedMag = Math.sqrt(sumApplied.fx ** 2 + sumApplied.fy ** 2 + sumApplied.fz ** 2);
  // "In equilibrio" se la magnitude del delta è << della magnitude dei carichi
  // applicati (1e-3 = 0.1% di tolleranza), oppure se applicato e' anch'esso ≈0
  const inEquilibrium = appliedMag < 1e-9
    ? deltaMag < 1e-6
    : deltaMag / appliedMag < 1e-3;

  if (!staticResults) {
    return (
      <div className="results-placeholder" data-testid="results-placeholder">
        Nessun calcolo statico disponibile. Lancia un'analisi statica dal
        passo <b>Esegui</b> per vedere le reazioni vincolari.
      </div>
    );
  }

  const fmt = (v: number, digits = 2) =>
    v.toLocaleString("it-IT", { minimumFractionDigits: digits, maximumFractionDigits: digits });
  const fmtNa = (v: number) => hasMoments ? fmt(v / 1000) : "n/a";

  return (
    <div className="results-data" data-testid="results-data-reazioni">
      {suspicious && (
        <div className="results-data-warn" data-testid="results-data-reazioni-warn" role="alert">
          <AlertTriangle size={14} aria-hidden />
          <span>
            <strong>Calcolo sospetto:</strong> i numeri qui sotto potrebbero non
            avere senso fisico. {SUSPICIOUS_REASON}
          </span>
        </div>
      )}

      <div className="results-data-tbar">
        <span>
          {rows.length === 0 ? "Nessun vincolo con reazione" : `${rows.length} vincolo${rows.length === 1 ? "" : "i"}`}
        </span>
      </div>

      <table className="results-data-table" data-testid="reazioni-table">
        <thead>
          <tr>
            <th>nodo</th>
            <th>Rx [kN]</th>
            <th>Ry [kN]</th>
            <th>Rz [kN]</th>
            <th>Mx [kN·m]</th>
            <th>My [kN·m]</th>
            <th>Mz [kN·m]</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={7} className="results-data-empty">Nessuna reazione</td></tr>
          )}
          {rows.map((r) => (
            <tr key={r.node_id} data-testid={`reazioni-row-${r.node_id}`}>
              <td>N{r.node_id}</td>
              <td>{fmt(r.fx / 1000)}</td>
              <td>{fmt(r.fy / 1000)}</td>
              <td>{fmt(r.fz / 1000)}</td>
              <td>{fmtNa(r.mx)}</td>
              <td>{fmtNa(r.my)}</td>
              <td>{fmtNa(r.mz)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Riepilogo controllo a mano: ΣR + ΣF = Δ */}
      <div className="results-data-sum">
        <div className="results-data-sum-row" data-testid="reazioni-sum-reactions">
          <span>Σ reazioni</span>
          <span className="results-data-sum-val">
            ({fmt(sumReactions.fx / 1000)}, {fmt(sumReactions.fy / 1000)}, {fmt(sumReactions.fz / 1000)}) kN
          </span>
        </div>
        <div className="results-data-sum-row" data-testid="reazioni-sum-loads">
          <span>Σ carichi applicati (nodali)</span>
          <span className="results-data-sum-val">
            ({fmt(sumApplied.fx / 1000)}, {fmt(sumApplied.fy / 1000)}, {fmt(sumApplied.fz / 1000)}) kN
          </span>
        </div>
        <div
          className={`results-data-sum-row results-data-sum-row--delta${inEquilibrium ? " is-ok" : " is-warn"}`}
          data-testid="reazioni-sum-delta"
          data-equilibrium={inEquilibrium ? "true" : "false"}
        >
          <span>Δ equilibrio (ΣR + ΣF)</span>
          <span className="results-data-sum-val">
            {inEquilibrium
              ? "≈ 0 ✓"
              : `(${fmt(delta.fx / 1000)}, ${fmt(delta.fy / 1000)}, ${fmt(delta.fz / 1000)}) kN ✗`}
          </span>
        </div>
      </div>

      <p className="results-data-hint">
        Il controllo a mano del senior: <b>ΣR + ΣF</b> deve essere ≈ 0 in
        equilibrio. Σ carichi qui considera solo i carichi <i>nodali</i>;
        distribuiti/pressioni/peso proprio sono esclusi dal controllo
        riassuntivo (step futuro).
      </p>
    </div>
  );
}
