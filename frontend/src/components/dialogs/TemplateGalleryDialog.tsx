/**
 * TemplateGalleryDialog (Precision v2.0 PR17 T3) — galleria template Precision.
 *
 * 9 modelli didattici precaricati con thumbnail + meta + descrizione.
 * Linguaggio Precision: hairline borders, mono labels, sharp radius.
 */
import { Boxes, ArrowRight } from "lucide-react";
import type { FEAModel } from "../../types/model";
import { useModalBackButton } from "../../hooks/useModalBackButton";


/** Descrizioni umane per i 9 template (chiave: id backend "ex_*"). */
const TEMPLATE_DESCRIPTIONS: Record<string, string> = {
  ex_simple_beam_2d:
    "Beam2D IPE 300 su 6 m con carico distribuito. Caso scolastico per validare statica.",
  ex_portal_frame_2d:
    "Telaio 4×6 m con incastri a base + carico tetto. Test convergenza modale.",
  ex_truss_3d:
    "Reticolo spaziale 3D con cavi e aste. Esempio truss/cable.",
  ex_shell_plate:
    "Piastra Q4 2×2 m vincolata sui 4 lati con pressione. Test shell.",
  ex_tower_3d:
    "Torre 3D con sezioni HEA + IPE. Esempio frame3D + dinamica.",
  ex_tri3_seismic:
    "Membrana T3 sismica. Test elementi triangolari + ground accel.",
  ex_cube_solid_h8:
    "Cubo solido H8 in trazione. Test elemento solido 3D.",
  ex_cable_bridge_2d:
    "Ponte strallato 2D con cavi pre-tesati. Test non-lineare arc-length.",
  ex_laminate_plate:
    "Piastra laminata 1×1 m cross-ply. Test shell laminato composito.",
};


interface Props {
  open: boolean;
  onClose: () => void;
  /** Tutti i modelli del backend (lo store interno filtra gli "ex_*"). */
  models: FEAModel[];
  /** Chiamato quando l'utente sceglie un template. */
  onSelect: (modelId: string) => void;
}


export function TemplateGalleryDialog({ open, onClose, models, onSelect }: Props) {
  useModalBackButton(open, onClose);
  if (!open) return null;

  const templates = models.filter((m) => m.id.startsWith("ex_"));

  return (
    <div
      className="fixed inset-0 z-dialog flex items-center justify-center bg-black/40 animate-fade-in"
      onClick={onClose}
      role="presentation"
      data-testid="template-gallery"
    >
      <div
        className="bg-bg-elevated border border-border-light shadow-dialog w-[calc(100vw-24px)] max-w-[820px] max-h-[calc(100vh-48px)] flex flex-col overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="template-gallery-title"
      >
        {/* Header Precision: icon + title font-display + sub mono */}
        <header className="px-5 py-3.5 border-b border-border flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-bg-info text-accent border border-border-light flex items-center justify-center flex-shrink-0">
              <Boxes className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 id="template-gallery-title" className="font-display text-lg font-semibold tracking-tight-1 text-ink">
                Galleria template
              </h2>
              <p className="font-mono text-[10px] uppercase tracking-wide-1 text-ink-3 mt-0.5">
                {templates.length} modelli didattici precaricati
              </p>
            </div>
          </div>
        </header>

        {/* Body grid */}
        <div className="p-4 overflow-y-auto flex-1 bg-bg-panel">
          {templates.length === 0 ? (
            <div className="text-center py-16">
              <div className="font-mono text-[10px] uppercase tracking-wide-2 text-ink-3 font-semibold mb-2">
                Nessun template
              </div>
              <p className="text-sm text-ink-2 max-w-[44ch] mx-auto leading-relaxed">
                Riavvia il backend per il seed degli esempi (
                <code className="font-mono bg-bg-hover px-1.5 py-0.5 text-ink">seed_examples()</code>
                ).
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {templates.map((t) => (
                <TemplateCard
                  key={t.id}
                  model={t}
                  description={TEMPLATE_DESCRIPTIONS[t.id]}
                  onOpen={() => {
                    onSelect(t.id);
                    onClose();
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="border-t border-border px-5 py-3 flex items-center justify-between flex-shrink-0 bg-bg-elevated">
          <span className="text-[11px] text-ink-3">
            I template sono modelli leggibili e modificabili come qualunque altro.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-sm font-medium text-ink-2 hover:text-ink hover:bg-bg-hover"
          >
            Annulla
          </button>
        </footer>
      </div>
    </div>
  );
}


function TemplateCard({
  model,
  description,
  onOpen,
}: {
  model: FEAModel;
  description?: string;
  onOpen: () => void;
}) {
  const nNodes = model.nodes?.length ?? 0;
  const nElem = model.elements?.length ?? 0;
  const nLoads = model.loads?.length ?? 0;
  const nConstr = model.constraints?.length ?? 0;

  return (
    <button
      type="button"
      onClick={onOpen}
      data-testid={`template-card-${model.id}`}
      className="group text-left bg-bg-elevated border border-border hover:border-accent/50 p-3.5 transition-colors flex flex-col gap-2 focus-visible:outline-none focus-visible:border-accent"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-display text-[15px] font-semibold tracking-tight-1 text-ink leading-snug">
          {model.name}
        </h3>
      </div>
      {description && (
        <p className="text-[12px] text-ink-2 leading-snug">{description}</p>
      )}
      <div className="flex flex-wrap items-center gap-1 font-mono text-[10px] text-ink-3 mt-1">
        <span className="bg-bg-panel border border-border px-1.5 py-0.5">{nNodes} N</span>
        <span className="bg-bg-panel border border-border px-1.5 py-0.5">{nElem} E</span>
        {nLoads > 0 && (
          <span className="bg-bg-panel border border-border px-1.5 py-0.5">{nLoads} L</span>
        )}
        {nConstr > 0 && (
          <span className="bg-bg-panel border border-border px-1.5 py-0.5">{nConstr} V</span>
        )}
      </div>
      <div className="mt-1 inline-flex items-center gap-1 text-[12px] text-accent font-medium group-hover:gap-2 transition-all">
        Apri template
        <ArrowRight className="w-3 h-3" />
      </div>
    </button>
  );
}
