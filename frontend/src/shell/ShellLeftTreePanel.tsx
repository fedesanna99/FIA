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

import { useEffect, useMemo, useRef, useState } from "react";
import {
  X, Circle, Spline, Layers, Anchor, ArrowDownToLine,
  GitBranch, ListTree, ChevronRight,
} from "lucide-react";

import { useLeftTreeStore } from "../store/leftTreeStore";
import { useModelStore } from "../store/modelStore";
// v3.4 Fetta E2.3 (30/05/2026 mattina): selezione bidirezionale.
// L'Albero scrive al selectionStore al click foglia + legge per
// highlight della foglia attiva (anche quando selezione viene dal
// viewport). rightPanelStore.openInspector() apre il panel DX nel
// terzo stato "inspector" che mostra NodeDetail/ElementDetail.
import { useSelectionStore } from "../store/selectionStore";
import { useRightPanelStore } from "../store/rightPanelStore";


interface TreeSection {
  /** Identificatore stabile (usato in data-testid + key). */
  key:
    | "nodes" | "elements" | "sections-materials"
    | "loads" | "constraints" | "combinations";
  /** Label user-facing italiano (matching prototipo v3 mockup). */
  label: string;
  /** Icona Lucide (stroke 1.8 come convention dei tb-iconbtn). */
  Icon: typeof Circle;
  /** v3.4 Fetta E2.3 (30/05/2026): la sezione e' espandibile in foglie
   *  cliccabili (Nodi/Elementi → click foglia apre Inspector). Le altre
   *  sezioni (Materiali, Vincoli, Carichi, Combinazioni) mostrano solo
   *  count finché non avranno ItemDetail dedicati — fetta futura. */
  expandable: boolean;
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
  { key: "nodes",              label: "Nodi",                Icon: Circle,           expandable: true  },
  { key: "elements",           label: "Elementi",            Icon: Spline,           expandable: true  },
  { key: "sections-materials", label: "Sezioni · materiali", Icon: Layers,           expandable: false },
  { key: "loads",              label: "Carichi",             Icon: ArrowDownToLine,  expandable: false },
  { key: "constraints",        label: "Vincoli",             Icon: Anchor,           expandable: false },
  { key: "combinations",       label: "Combinazioni",        Icon: GitBranch,        expandable: false },
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

  // ── v3.4 Fetta E2.3 (30/05/2026): selezione bidirezionale ────────
  // L'Albero scrive a selectionStore + apre Inspector al click foglia.
  // Subscribe a selectionStore per highlight foglia attiva + auto-expand
  // della sezione corrispondente quando la selezione viene dal viewport
  // (es. l'utente clicca un nodo 3D → si apre "Nodi" + N3 highlighted).
  const selectedNodeId = useSelectionStore((s) => s.selectedNodeId);
  const selectedElementId = useSelectionStore((s) => s.selectedElementId);
  const selectNode = useSelectionStore((s) => s.selectNode);
  const selectElement = useSelectionStore((s) => s.selectElement);
  const openInspector = useRightPanelStore((s) => s.openInspector);

  // Single-expansion locale (UI-only, non persisted): solo 1 sezione
  // espansa alla volta per economia visuale (le foglie possono essere
  // tante — vedere multiple sezioni aperte e' rumoroso).
  const [expandedSection, setExpandedSection] = useState<
    TreeSection["key"] | null
  >(null);
  const activeLeafRef = useRef<HTMLButtonElement | null>(null);

  // Auto-expand sezione quando selezione cambia da fuori (viewport click
  // o cambio modello). Se l'utente sta gia' navigando "Nodi" e clicca
  // un Element nel viewport, la sezione passa a "Elementi".
  useEffect(() => {
    if (selectedNodeId !== null) {
      setExpandedSection("nodes");
    } else if (selectedElementId !== null) {
      setExpandedSection("elements");
    }
  }, [selectedNodeId, selectedElementId]);

  // Auto-scroll foglia attiva in vista quando selectionId / expansion
  // cambiano. `block: "nearest"` evita scroll inutili se gia' visibile;
  // `behavior: "smooth"` per UX polish.
  useEffect(() => {
    if (activeLeafRef.current) {
      activeLeafRef.current.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
  }, [selectedNodeId, selectedElementId, expandedSection]);

  const handleSectionClick = (
    key: TreeSection["key"],
    expandable: boolean,
  ) => {
    if (!expandable) return;
    setExpandedSection((curr) => (curr === key ? null : key));
  };

  const handleNodeLeafClick = (id: number) => {
    selectNode(id);
    openInspector();
  };

  const handleElementLeafClick = (id: number) => {
    selectElement(id);
    openInspector();
  };

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
              const isExpanded = expandedSection === sec.key;
              // v3.4 Fetta E2.3: header e' clickable solo se expandable
              // (Nodi/Elementi). Le altre sezioni restano informative
              // (count read-only) — fetta futura per ItemDetail dedicati.
              return (
                <li
                  key={sec.key}
                  className={`slt-item${isExpanded ? " expanded" : ""}${
                    sec.expandable ? "" : " not-expandable"
                  }`}
                  data-testid={`shell-left-tree-${sec.key}`}
                  data-state={isExpanded ? "open" : "closed"}
                >
                  <button
                    type="button"
                    className="slt-item-head"
                    onClick={() => handleSectionClick(sec.key, sec.expandable)}
                    aria-expanded={sec.expandable ? isExpanded : undefined}
                    disabled={!sec.expandable}
                    data-testid={`shell-left-tree-${sec.key}-head`}
                  >
                    {sec.expandable ? (
                      <ChevronRight
                        className="slt-item-chevron"
                        size={12}
                        strokeWidth={2}
                        data-state={isExpanded ? "open" : "closed"}
                        aria-hidden
                      />
                    ) : (
                      <span className="slt-item-chevron-spacer" aria-hidden />
                    )}
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
                  </button>

                  {/* v3.4 Fetta E2.3 (30/05/2026): foglie cliccabili per
                      Nodi/Elementi. Click foglia → selectionStore +
                      openInspector. Auto-scroll alla foglia attiva via
                      activeLeafRef + scrollIntoView nel useEffect. */}
                  {isExpanded && sec.key === "nodes" && model && (
                    <ul
                      className="slt-leaves"
                      data-testid="shell-left-tree-nodes-leaves"
                      aria-label="Foglie Nodi"
                    >
                      {model.nodes.length === 0 ? (
                        <li className="slt-leaf-empty">Nessun nodo.</li>
                      ) : (
                        model.nodes.map((node) => {
                          const isActive = selectedNodeId === node.id;
                          return (
                            <li key={node.id}>
                              <button
                                type="button"
                                ref={isActive ? activeLeafRef : null}
                                className={`slt-leaf${isActive ? " is-active" : ""}`}
                                onClick={() => handleNodeLeafClick(node.id)}
                                aria-current={isActive ? "true" : undefined}
                                data-testid={`shell-left-tree-leaf-node-${node.id}`}
                              >
                                <span className="slt-leaf-id">N{node.id}</span>
                                <span className="slt-leaf-meta">
                                  ({node.x.toFixed(1)}, {node.y.toFixed(1)}, {node.z.toFixed(1)})
                                </span>
                              </button>
                            </li>
                          );
                        })
                      )}
                    </ul>
                  )}

                  {isExpanded && sec.key === "elements" && model && (
                    <ul
                      className="slt-leaves"
                      data-testid="shell-left-tree-elements-leaves"
                      aria-label="Foglie Elementi"
                    >
                      {model.elements.length === 0 ? (
                        <li className="slt-leaf-empty">Nessun elemento.</li>
                      ) : (
                        model.elements.map((el) => {
                          const isActive = selectedElementId === el.id;
                          const i = el.nodes[0];
                          const j = el.nodes[el.nodes.length - 1];
                          return (
                            <li key={el.id}>
                              <button
                                type="button"
                                ref={isActive ? activeLeafRef : null}
                                className={`slt-leaf${isActive ? " is-active" : ""}`}
                                onClick={() => handleElementLeafClick(el.id)}
                                aria-current={isActive ? "true" : undefined}
                                data-testid={`shell-left-tree-leaf-element-${el.id}`}
                              >
                                <span className="slt-leaf-id">E{el.id}</span>
                                <span className="slt-leaf-meta">
                                  N{i} → N{j}
                                </span>
                              </button>
                            </li>
                          );
                        })
                      )}
                    </ul>
                  )}
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
