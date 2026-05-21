/**
 * useNavigationCommands (v1.5 follow-up) — generazione dinamica di voci palette
 * per ogni nodo ed elemento del modello attivo.
 *
 * Razionale: la palette statica (`paletteItems.ts`) copre ~135 voci, ma il
 * brief v1.5 puntava a 180+ tramite voci contestuali. La via piu' utile e'
 * "vai al nodo N42" / "vai all'elemento E17" senza dover scrollare le liste
 * laterali — Ctrl+K, digita "n42" o "42", Enter, NodeDetail si apre.
 *
 * Implementazione:
 *  - Hook letto da CommandPalette.tsx via `useNavigationCommands()`
 *  - Memoized su `model?.id` + length di nodes/elements (no ri-render gratis)
 *  - Cap di sicurezza: se il modello ha >500 nodi, mostriamo solo i primi 200
 *    (cmdk fuzzy match resta veloce anche cosi'; i mesh enormi (~mesh wizard)
 *    fanno saltare la palette).
 *  - Section: "commands" (cosi' compaiono nel gruppo principale invece di una
 *    sezione separata che richiederebbe nuovo SECTION_ORDER entry)
 *  - Group: "Navigazione · Nodi" / "Navigazione · Elementi" cosi' restano
 *    raggruppati visualmente nella palette
 */
import { useMemo } from "react";
import { MousePointerClick, Boxes } from "lucide-react";
import { useModelStore } from "../store/modelStore";
import type { PaletteItem } from "../lib/paletteItems";


/** Cap massimo per evitare di intasare la palette con modelli da migliaia di nodi. */
const MAX_DYNAMIC_ITEMS = 200;


/**
 * Genera voci palette per la navigazione contestuale.
 *
 * @returns array di PaletteItem (vuoto se model=null).
 */
export function useNavigationCommands(): PaletteItem[] {
  const model = useModelStore((s) => s.model);

  return useMemo<PaletteItem[]>(() => {
    if (!model) return [];

    const nodes = model.nodes.slice(0, MAX_DYNAMIC_ITEMS);
    const elements = model.elements.slice(0, MAX_DYNAMIC_ITEMS);

    const nodeItems: PaletteItem[] = nodes.map((n) => ({
      id: `goto-node-${n.id}`,
      label: `Vai a · Nodo N${n.id}`,
      description: `(${n.x.toFixed(2)}, ${n.y.toFixed(2)}, ${n.z.toFixed(2)})${n.label ? ` · ${n.label}` : ""}`,
      aliases: [
        `n${n.id}`,
        String(n.id),
        "node",
        "nodo",
        "vai",
        "goto",
        ...(n.label ? [n.label] : []),
      ],
      section: "commands",
      group: "Navigazione · Nodi",
      icon: MousePointerClick,
      actionKind: "goto-node",
      payload: { nodeId: n.id },
      needsModel: true,
    }));

    const elementItems: PaletteItem[] = elements.map((e) => ({
      id: `goto-element-${e.id}`,
      label: `Vai a · Elemento E${e.id}`,
      description: `${e.type} · nodi [${e.nodes.join(",")}] · mat ${e.material_id}`,
      aliases: [
        `e${e.id}`,
        String(e.id),
        "element",
        "elemento",
        "vai",
        "goto",
        e.type,
      ],
      section: "commands",
      group: "Navigazione · Elementi",
      icon: Boxes,
      actionKind: "goto-element",
      payload: { elementId: e.id },
      needsModel: true,
    }));

    return [...nodeItems, ...elementItems];
  }, [model]);
}


/**
 * Helper sincrono per snapshot conteggio voci dinamiche (per test/debug).
 * Non e' un hook — usa lo store API direttamente.
 */
export function getNavigationCommandsCount(): {
  nodes: number;
  elements: number;
  total: number;
  capped: boolean;
} {
  const model = useModelStore.getState().model;
  if (!model) return { nodes: 0, elements: 0, total: 0, capped: false };
  const nNodes = Math.min(model.nodes.length, MAX_DYNAMIC_ITEMS);
  const nEls = Math.min(model.elements.length, MAX_DYNAMIC_ITEMS);
  return {
    nodes: nNodes,
    elements: nEls,
    total: nNodes + nEls,
    capped:
      model.nodes.length > MAX_DYNAMIC_ITEMS || model.elements.length > MAX_DYNAMIC_ITEMS,
  };
}
