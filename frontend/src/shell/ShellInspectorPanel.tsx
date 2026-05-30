/**
 * ShellInspectorPanel (v3.4 Fetta E2.3 · 30/05/2026 mattina).
 *
 * Panel destro della Shell custom in stato "inspector" — terzo stato
 * del `rightPanelStore` (oltre "open" e "closed" di E2.2/M3).
 * Renderizzato quando `panelState === "inspector"` (vedi Shell.tsx).
 *
 * Mostra le proprieta' dell'entita' attualmente selezionata via
 * `selectionStore`:
 *   - `selectedNodeId !== null`   → NodeDetail (esistente Sprint 5 G11)
 *   - `selectedElementId !== null` → ElementDetailPlaceholder (MVP E2.3,
 *     full ElementDetail in fetta successiva)
 *   - nessuna selezione           → empty state "Niente selezionato"
 *
 * Header: titolo + sottotitolo dinamico (es. "Nodo 3" o "Elemento E2")
 * + bottone X che chiama `selectionStore.clear()` + `rightPanelStore.
 * open()` per tornare al content della fase corrente (Make/Solve/Verify).
 *
 * Filosofia E2.3: "il panel destro racconta sempre cosa sta succedendo"
 *   - default (fase): cosa fa la fase
 *   - inspector: cosa hai selezionato
 *   - closed: una tab verticale che permette di riaprire
 * Single-source di selezione (selectionStore) → l'Albero e il viewport
 * e l'inspector restano sempre sincronizzati cross-component.
 */
import { X, MousePointerSquareDashed } from "lucide-react";
import { useSelectionStore } from "../store/selectionStore";
import { useRightPanelStore } from "../store/rightPanelStore";
import { useModelStore } from "../store/modelStore";
import { NodeDetail } from "./panels/inspect/NodeDetail";


export function ShellInspectorPanel() {
  const selectedNodeId = useSelectionStore((s) => s.selectedNodeId);
  const selectedElementId = useSelectionStore((s) => s.selectedElementId);
  const clearSelection = useSelectionStore((s) => s.clear);
  const openPanel = useRightPanelStore((s) => s.open);

  // Subtitle dinamico: descrive l'entita' selezionata. Usato anche per
  // hint UX nell'empty state quando nulla e' selezionato.
  const subtitle =
    selectedNodeId !== null
      ? `Nodo ${selectedNodeId}`
      : selectedElementId !== null
        ? `Elemento ${selectedElementId}`
        : "Nessuna selezione";

  const handleClose = () => {
    // Pulisci selezione (cosi' Albero/viewport tornano stato neutro) +
    // riapri panel in modalita' "open" (mostra content fase corrente).
    clearSelection();
    openPanel();
  };

  return (
    <aside
      className="shell-inspector-panel"
      aria-label="Inspector — proprietà selezione"
      data-shell="inspector-panel"
      data-testid="shell-inspector-panel"
    >
      <header className="sip-head">
        <div className="sip-head-row">
          <div className="sip-icon">
            <MousePointerSquareDashed size={16} strokeWidth={1.8} aria-hidden />
          </div>
          <div className="sip-head-text">
            <h2 className="sip-title">Ispeziona</h2>
            <p className="sip-subtitle" data-testid="shell-inspector-subtitle">
              {subtitle}
            </p>
          </div>
          <button
            type="button"
            className="sip-close"
            onClick={handleClose}
            aria-label="Chiudi inspector"
            title="Chiudi inspector"
            data-testid="shell-inspector-close"
          >
            <X size={14} strokeWidth={1.8} aria-hidden />
          </button>
        </div>
      </header>

      <div className="sip-body">
        {selectedNodeId !== null ? (
          <NodeDetail nodeId={selectedNodeId} />
        ) : selectedElementId !== null ? (
          <ElementDetailPlaceholder elementId={selectedElementId} />
        ) : (
          <ShellInspectorEmpty />
        )}
      </div>
    </aside>
  );
}


/**
 * Empty state: l'utente ha aperto inspector ma niente e' selezionato.
 * Caso edge: di solito openInspector e' chiamato DOPO una selezione
 * (ShellLeftTreePanel handlers, viewport renderers). Defensive UI.
 */
function ShellInspectorEmpty() {
  return (
    <div className="sip-empty" data-testid="shell-inspector-empty">
      <p className="sip-empty-title">Niente selezionato</p>
      <p className="sip-empty-hint">
        Clicca un nodo o un elemento nell'Albero del modello (a sinistra)
        oppure direttamente nel viewport 3D per vedere qui le sue proprietà.
      </p>
    </div>
  );
}


/**
 * Placeholder per ElementDetail MVP — Fetta E2.3 chiude scope con
 * NodeDetail (esistente). ElementDetail completo (sezione, materiale,
 * lunghezza, releases, forze interne, ...) e' fetta successiva.
 *
 * Mostra: ID, tipo, nodi connessi, materiale + sezione assigned. Lettura
 * read-only da modelStore (zero touch al dominio).
 */
function ElementDetailPlaceholder({ elementId }: { elementId: number }) {
  const model = useModelStore((s) => s.model);
  const element = model?.elements.find((e) => e.id === elementId) ?? null;

  if (!element) {
    return (
      <div className="sip-placeholder" data-testid="shell-inspector-element-missing">
        <p>Elemento E{elementId} non trovato nel modello corrente.</p>
      </div>
    );
  }

  return (
    <div
      className="sip-placeholder"
      data-testid={`shell-inspector-element-${elementId}`}
    >
      <dl className="sip-dl">
        <dt>ID</dt><dd className="sip-dl-mono">E{element.id}</dd>
        <dt>Tipo</dt><dd className="sip-dl-mono">{element.type}</dd>
        <dt>Nodi</dt>
        <dd className="sip-dl-mono">
          {element.nodes.map((n, i) => (
            <span key={n}>
              N{n}
              {i < element.nodes.length - 1 ? " → " : ""}
            </span>
          ))}
        </dd>
        {element.section_id && (
          <>
            <dt>Sezione</dt>
            <dd className="sip-dl-mono">{element.section_id}</dd>
          </>
        )}
        <dt>Materiale</dt>
        <dd className="sip-dl-mono">{element.material_id}</dd>
      </dl>
      <p className="sip-placeholder-note">
        Dettagli completi (lunghezza, releases, forze interne,
        verifiche per-elemento) in arrivo in una fetta dedicata.
      </p>
    </div>
  );
}
