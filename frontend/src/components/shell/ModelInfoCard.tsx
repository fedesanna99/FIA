/**
 * ModelInfoCard (v1.8 T4, esteso v1.9.0 T3).
 *
 * Card persistente always-on sulla shell desktop (md+), mostra info
 * sintetiche del modello attivo: nome, counts, unita', dimensione, e
 * **Trust Layer** badge (v1.9.0 T3).
 *
 * Trust Layer (deterministico, basato su id pattern del modello):
 *   - 🟢 "Utente"   — modello creato dall'utente (id non riconosciuto come template/AI)
 *   - 🟡 "Template" — id inizia con "ex_" (template didattico backend)
 *   - 🟠 "Importato" — id contiene "imp_" o "dxf_" o "ifc_" (placeholder per import)
 *   - 🟣 "AI-gen"   — id inizia con "ai_" (placeholder per AI generation v2.0)
 *
 * Si nasconde quando model = null.
 */
import { useModelStore } from "../../store/modelStore";

type TrustOrigin = "user" | "template" | "imported" | "ai";

function inferTrustOrigin(id: string): TrustOrigin {
  if (id.startsWith("ai_")) return "ai";
  if (id.startsWith("ex_")) return "template";
  if (id.startsWith("imp_") || id.startsWith("dxf_") || id.startsWith("ifc_")) return "imported";
  return "user";
}

const TRUST_STYLE: Record<TrustOrigin, { label: string; cls: string; hint: string }> = {
  user: {
    label: "Utente",
    cls: "bg-bg-success text-ink-success border-success/30",
    hint: "Modello creato dall'utente (Studio Pro o New). Fidato.",
  },
  template: {
    label: "Template",
    cls: "bg-bg-info text-ink-info border-ink-info/30",
    hint: "Template didattico fornito (id ex_*). Sostituisci sezione/carichi prima della verifica formale.",
  },
  imported: {
    label: "Importato",
    cls: "bg-bg-warn text-ink-warn border-warn/30",
    hint: "Modello da import esterno (DXF/IFC/JSON). Verifica unità e topologia.",
  },
  ai: {
    label: "AI-gen",
    cls: "bg-bg-purple text-ink-purple border-purple/30",
    hint: "Generato da AI. Richiede revisione completa prima dell'uso normativo.",
  },
};

export function ModelInfoCard() {
  const model = useModelStore((s) => s.model);
  if (!model) return null;

  const origin = inferTrustOrigin(model.id);
  const trust = TRUST_STYLE[origin];

  return (
    <div
      className="border-b border-border p-3 space-y-1.5 bg-bg-panel"
      data-testid="model-info-card"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="text-[10px] uppercase tracking-wider text-ink-muted font-mono font-semibold">
          Model information
        </div>
        {/* v1.9.0 T3: Trust Layer badge */}
        <span
          title={trust.hint}
          className={`text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded border leading-none ${trust.cls}`}
          data-testid={`trust-badge-${origin}`}
        >
          {trust.label}
        </span>
      </div>
      <div
        className="text-sm font-semibold text-ink truncate"
        title={model.name}
        data-testid="model-info-name"
      >
        {model.name}
      </div>
      <div className="text-[11px] text-ink-muted leading-snug" data-testid="model-info-counts">
        {model.nodes.length} nodi · {model.elements.length} elementi
        <br />
        {model.constraints.length} vincoli · {model.loads.length} carichi
      </div>
      <div className="text-[10px] text-ink-dim font-mono">
        {model.is_3d ? "3D" : "2D"} · {model.units}
      </div>
    </div>
  );
}
