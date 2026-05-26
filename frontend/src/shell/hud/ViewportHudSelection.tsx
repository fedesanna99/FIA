// v2.6.2 Shell · HUD Selection (top-center)
// Breadcrumb selezione attiva: tag accent + tipo entità + meta info + close.
// Placeholder Fase 2: lettura selezione da uiStore (se disponibile).

import { X } from "lucide-react";

export function ViewportHudSelection() {
  // Placeholder finché non c'è binding allo store selezione.
  // Mostra solo se c'è una selezione attiva.
  const selectionMeta = null as { tag: string; label: string; meta: string } | null;

  if (!selectionMeta) return null;

  return (
    <div className="vp-selection" data-hud="selection">
      <span className="vp-sel-tag">{selectionMeta.tag}</span>
      <span>{selectionMeta.label}</span>
      <span className="vp-sel-meta">{selectionMeta.meta}</span>
      <button
        type="button"
        className="tb-iconbtn"
        style={{ marginLeft: 4, width: 22, height: 22 }}
        aria-label="Deseleziona"
      >
        <X size={12} />
      </button>
    </div>
  );
}
