/**
 * TemplateGalleryDialog (v1.6 Sprint 0 · B01) — galleria dei modelli
 * esempio precaricati dal backend (`backend/examples.py`).
 *
 * Sostituisce il vecchio behavior della Dashboard card "Da template" che
 * apriva (erroneamente) il NewModelDialog vuoto. Ora vengono mostrate
 * le ~9 strutture didattiche con counts nodi/elementi + descrizione +
 * bottone "Apri".
 *
 * Sorgente dati: lo store backend espone i template come modelli con id
 * "ex_*" (vedi seed_examples). Filtriamo l'array `models` passato.
 */
import { Boxes } from "lucide-react";
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
  // v1.6 S0 · B08: back hardware mobile chiude la galleria.
  useModalBackButton(open, onClose);
  if (!open) return null;

  const templates = models.filter((m) => m.id.startsWith("ex_"));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-label="Galleria template"
      data-testid="template-gallery"
    >
      <div
        className="bg-bg-panel border border-border rounded-lg shadow-dialog w-[calc(100vw-24px)] max-w-[780px] max-h-[calc(100vh-48px)] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="px-5 py-3.5 border-b border-border flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-bg-info text-ink-info flex items-center justify-center">
              <Boxes className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-ink">Galleria template</h2>
              <p className="text-[11px] text-ink-muted">
                {templates.length} modelli didattici precaricati
              </p>
            </div>
          </div>
          {/* v1.7 T5: niente crocetta X. Dismiss via ESC, backdrop, swipe-back. */}
        </header>

        <div className="p-4 overflow-y-auto flex-1">
          {templates.length === 0 ? (
            <div className="text-center py-12 text-[12px] text-ink-muted">
              Nessun template caricato. Riavvia il backend per il seed degli
              esempi (<code className="font-mono">seed_examples()</code>).
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
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

        <footer className="border-t border-border px-5 py-3 flex items-center justify-between flex-shrink-0">
          <span className="text-[11px] text-ink-muted">
            I template sono modelli leggibili e modificabili come qualunque altro.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-[12px] text-ink-muted hover:text-ink px-2 py-1 rounded hover:bg-bg-hover"
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
      className="text-left bg-bg-surface border border-border hover:border-ink-info/40 hover:shadow-pop rounded-lg p-3.5 transition group flex flex-col gap-2"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-sm text-ink leading-snug">{model.name}</h3>
      </div>
      {description && (
        <p className="text-[11px] text-ink-muted leading-snug">{description}</p>
      )}
      <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono text-ink-dim mt-1">
        <span className="bg-bg-page border border-border rounded px-1.5 py-0.5">{nNodes} nodi</span>
        <span className="bg-bg-page border border-border rounded px-1.5 py-0.5">{nElem} elem</span>
        {nLoads > 0 && (
          <span className="bg-bg-page border border-border rounded px-1.5 py-0.5">{nLoads} loads</span>
        )}
        {nConstr > 0 && (
          <span className="bg-bg-page border border-border rounded px-1.5 py-0.5">{nConstr} vincoli</span>
        )}
      </div>
      <div className="mt-1 text-[11px] text-ink-info group-hover:text-ink-info font-medium">
        Apri →
      </div>
    </button>
  );
}
