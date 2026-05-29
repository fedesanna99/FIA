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

import { useMemo } from "react";
import {
  X, Circle, Spline, Layers, Anchor, ArrowDownToLine,
  GitBranch, ListTree,
} from "lucide-react";

import { useLeftTreeStore } from "../store/leftTreeStore";
import { useModelStore } from "../store/modelStore";


interface TreeSection {
  /** Identificatore stabile (usato in data-testid + key). */
  key:
    | "nodes" | "elements" | "sections-materials"
    | "loads" | "constraints" | "combinations";
  /** Label user-facing italiano (matching prototipo v3 mockup). */
  label: string;
  /** Icona Lucide (stroke 1.8 come convention dei tb-iconbtn). */
  Icon: typeof Circle;
}


// v3.4 Fetta E2.4-bis (29/05 sera): ordine e nomi allineati al
// prototipo v3 mockup (`socio/05-prototipi-workspace-v3/`):
//   Nodi → Elementi → Sezioni · materiali (combinati) →
//   Carichi → Vincoli → Combinazioni
// Sezioni e Materiali sono fusi in una sola sezione perche' nel
// modello dominio sono accoppiati (ogni Element ha `material_id` +
// `section_id`). Combinazioni e' attualmente "—" (non implementato
// nel modello dominio) — vedi `counts` sotto.
const SECTIONS: TreeSection[] = [
  { key: "nodes",              label: "Nodi",                Icon: Circle           },
  { key: "elements",           label: "Elementi",            Icon: Spline           },
  { key: "sections-materials", label: "Sezioni · materiali", Icon: Layers           },
  { key: "loads",              label: "Carichi",             Icon: ArrowDownToLine  },
  { key: "constraints",        label: "Vincoli",             Icon: Anchor           },
  { key: "combinations",       label: "Combinazioni",        Icon: GitBranch        },
];


export function ShellLeftTreePanel() {
  const close = useLeftTreeStore((s) => s.close);
  const model = useModelStore((s) => s.model);

  // v3.4 Fetta E2.4-bis (29/05 sera): count "Sezioni · materiali"
  // derivato dal numero di `section_id` distinti tra gli elementi del
  // modello. Pattern: ogni Element ha section_id + material_id, e nel
  // mockup v3 il count rappresenta la sezione che "tiene tutto" (es.
  // "IPE 300 / S355" = 1 sezione). Fallback 0 se model vuoto.
  const sectionsMaterialsCount = useMemo(() => {
    if (!model || model.elements.length === 0) return 0;
    const ids = new Set(
      model.elements
        .map((e) => e.section_id)
        .filter((s): s is string => typeof s === "string" && s.length > 0),
    );
    // Se nessun section_id e' definito (modelli legacy/template senza
    // sezione esplicita) ma ci sono materiali, conta i materiali.
    if (ids.size === 0) return model.materials?.length ?? 0;
    return ids.size;
  }, [model]);

  // v3.4 Fetta E2.4-bis: count delle 6 sezioni. Tipo `number | null`
  // perche' "Combinazioni" non e' ancora implementato nel modello
  // dominio → render mostra "—" (pattern "4 stati onesti": preferire
  // l'onesto-vago al falso-preciso, vedi CULTURE.md filosofia 🤍).
  const counts: Record<TreeSection["key"], number | null> = {
    nodes:                 model?.nodes.length ?? 0,
    elements:              model?.elements.length ?? 0,
    "sections-materials":  sectionsMaterialsCount,
    loads:                 model?.loads.length ?? 0,
    constraints:           model?.constraints.length ?? 0,
    // TODO: cablare a un futuro `combinationsStore` (SLU / SLE / Sisma).
    // Per ora "—": non implementato, NON falso 0.
    combinations:          null,
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
        <>
          <ul
            className="slt-list"
            aria-label="Sezioni del modello"
          >
            {SECTIONS.map((sec) => {
              const SecIcon = sec.Icon;
              const count = counts[sec.key];
              // 4 stati onesti: null → "—" (non implementato/non applicabile).
              const display = count === null ? "—" : count;
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
                    {display}
                  </span>
                </li>
              );
            })}
          </ul>
          {/* v3.4 Fetta E2.4-bis (29/05 sera) · tree-note del prototipo v3.
              Riproduce testualmente la nota del mockup
              `socio/05-prototipi-workspace-v3/fea-pro-prototipo-v2-strato-esperto.html`
              come ancora UX: spiega che il panel SX e' "strato esperto a
              richiesta" + accenna al comportamento futuro (apertura
              automatica per modelli grandi). */}
          <div className="slt-tree-note" data-testid="shell-left-tree-note">
            <p>
              Di default questo pannello è <strong>chiuso</strong>: il workspace
              resta pulito. Si apre a richiesta — e comparirà <strong>da solo</strong>
              {" "}sui modelli grandi (oltre ~50 elementi), dove navigare a vista
              non basta più.
            </p>
          </div>
        </>
      )}
    </aside>
  );
}
