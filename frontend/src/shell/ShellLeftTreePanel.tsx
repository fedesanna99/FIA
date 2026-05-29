// v3.4 Fetta E2-IA Commit E2.4 — Shell custom · Panel SX "Albero modello"
//
// Panel sinistro dedicato alla gerarchia del modello caricato. Visibile
// SOLO quando `leftTreeStore.treeState === "open"`. Inserito come seconda
// colonna della grid `.shell-mid` tra il Rail e il Viewport
// (rail / albero / viewport / panel destro). Default closed → grid 3-col
// invariata (zero regression).
//
// Header: titolo "Albero modello" + nome del modello corrente + bottone X
// che chiude il panel via `leftTreeStore.close()`.
//
// Body: 5 sezioni con eyebrow MONO + count tabular-nums della struttura:
//   - Nodi
//   - Elementi
//   - Materiali
//   - Vincoli
//   - Carichi
//
// Count letti dal `modelStore` in READ-ONLY (store di dominio intoccabile
// in scrittura — vedi `.claude/ricordi/CULTURE.md` "Regole non negoziabili").
// Quando model === null → empty state con call-to-action verso Make.
//
// Stili in `frontend/src/styles/shell.css` (`.shell-left-tree` + `.slt-*`).
// `--left-tree-w` override gestita da Shell.tsx via `data-left-tree-state`
// attribute sul root (open → 240px, closed → 0px).
//
// Pattern simmetrico a ShellPanel (E2.2 ShellRightReopenTab): stesso
// header eyebrow + X chiusura, stessa filosofia "4 stati onesti" per i
// count (0 / valore vero / empty state quando nessun modello).
//
// NB: questa fetta NON implementa la selezione bidirezionale viewport ↔
// albero (es. click su "Nodi" → seleziona tutti i nodi nel viewport).
// Quello e' scope E2.3 / E3. Qui solo lettura + count.

import { X, Circle, Spline, Layers, Anchor, ArrowDownToLine, ListTree } from "lucide-react";

import { useLeftTreeStore } from "../store/leftTreeStore";
import { useModelStore } from "../store/modelStore";


interface TreeSection {
  /** Identificatore stabile (usato in data-testid + key). */
  key: "nodes" | "elements" | "materials" | "constraints" | "loads";
  /** Label user-facing italiano. */
  label: string;
  /** Icona Lucide (stroke 1.8 come convention dei tb-iconbtn). */
  Icon: typeof Circle;
}


const SECTIONS: TreeSection[] = [
  { key: "nodes",       label: "Nodi",       Icon: Circle },
  { key: "elements",    label: "Elementi",   Icon: Spline },
  { key: "materials",   label: "Materiali",  Icon: Layers },
  { key: "constraints", label: "Vincoli",    Icon: Anchor },
  { key: "loads",       label: "Carichi",    Icon: ArrowDownToLine },
];


export function ShellLeftTreePanel() {
  const close = useLeftTreeStore((s) => s.close);
  const model = useModelStore((s) => s.model);

  // v3.4 Fetta E2-IA Commit E2.4: count tabular-nums delle sezioni.
  // `materials` e' opzionale nel FEAModel (vedi types/model.ts riga 94)
  // — fallback a 0 evita "—" nei test e in render. Lo stato veramente
  // "non applicabile" e' modeo === null (empty state separato sotto).
  const counts: Record<TreeSection["key"], number> = {
    nodes:       model?.nodes.length ?? 0,
    elements:    model?.elements.length ?? 0,
    materials:   model?.materials?.length ?? 0,
    constraints: model?.constraints.length ?? 0,
    loads:       model?.loads.length ?? 0,
  };

  const isEmpty = model === null;
  const modelName = model?.name ?? "—";

  return (
    <aside
      className="shell-left-tree"
      aria-label="Albero modello"
      data-shell="left-tree"
      data-testid="shell-left-tree-panel"
    >
      <div className="slt-head">
        <div className="slt-head-row">
          <div className="slt-icon">
            <ListTree size={16} strokeWidth={1.8} aria-hidden />
          </div>
          <h2>Albero modello</h2>
          <button
            type="button"
            className="slt-close"
            onClick={close}
            aria-label="Chiudi albero"
            title="Chiudi albero"
            data-testid="shell-left-tree-close"
          >
            <X size={14} strokeWidth={1.8} aria-hidden />
          </button>
        </div>
        <p
          className="slt-desc"
          data-testid="shell-left-tree-model-name"
        >
          {modelName}
        </p>
      </div>

      {isEmpty ? (
        <div className="slt-empty" data-testid="shell-left-tree-empty">
          <p className="slt-empty-msg">Nessun modello caricato.</p>
          <p className="slt-empty-hint">
            Apri un modello dalla Dashboard oppure crea un nuovo modello
            da <strong>Make → Geometria</strong>.
          </p>
        </div>
      ) : (
        <ul
          className="slt-list"
          aria-label="Sezioni del modello"
        >
          {SECTIONS.map((sec) => {
            const SecIcon = sec.Icon;
            const count = counts[sec.key];
            return (
              <li
                key={sec.key}
                className="slt-item"
                data-testid={`shell-left-tree-${sec.key}`}
              >
                <span className="slt-item-icon">
                  <SecIcon size={14} strokeWidth={1.8} aria-hidden />
                </span>
                <span className="slt-item-label">{sec.label}</span>
                <span
                  className="slt-item-count"
                  data-testid={`shell-left-tree-${sec.key}-count`}
                >
                  {count}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}
