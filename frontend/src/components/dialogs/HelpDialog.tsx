/**
 * HelpDialog (Precision v2.0 PR17 T3) — guida rapida Precision-aligned.
 *
 * Lista scorciatoie + features per area. Linguaggio Precision: section
 * eyebrow mono, kbd pill hairline border, accent cyan per bullet.
 */
import { Dialog } from "./Dialog";

interface Props {
  open: boolean;
  onClose: () => void;
}

const SHORTCUTS: { keys: string; description: string }[] = [
  { keys: "N", description: "Aggiungi nodo" },
  { keys: "E", description: "Aggiungi elemento" },
  { keys: "L", description: "Aggiungi carico" },
  { keys: "C", description: "Aggiungi vincolo" },
  { keys: "M", description: "Wizard mesh" },
  { keys: "Del", description: "Elimina selezione" },
  { keys: "Esc", description: "Deseleziona tutto" },
  { keys: "F5", description: "Esegui analisi" },
  { keys: "⌘ K", description: "Command palette" },
  { keys: "⇧ Click", description: "Aggiungi a selezione" },
];

const FEATURES: { area: string; items: string[] }[] = [
  {
    area: "Modellazione",
    items: [
      "Trascina un file .json nel viewport per importare un modello",
      "Click Duplica per partire da un esempio precaricato",
      "Click Modifica per cambiare nome/unità del modello",
      "Hover nodo/elemento → tooltip flottante con info e risultati",
    ],
  },
  {
    area: "Analisi",
    items: [
      "Statica · Modale · Dinamica (Newmark-β) · Buckling lineare",
      "WebSocket di progresso solver real-time nella status bar",
      "Tab Risultati → Sommario / Tabella / Grafico per ogni tipo",
      "FFT + spettro di risposta Sa(T) post-analisi dinamica",
      "Auto Rayleigh: calcola α, β dalla modale (ξ = 5%)",
    ],
  },
  {
    area: "Visualizzazione",
    items: [
      "Deformata · Forme modali animate · Risposta dinamica nel tempo",
      "Stress colormap (Jet) · Diagrammi N/V/M · Vettori σ₁/σ₂",
      "Timeline HUD per scrubbing della risposta dinamica",
    ],
  },
  {
    area: "Export",
    items: ["JSON modello+risultati · CSV tabelle · DXF geometria · Report PDF"],
  },
];

export function HelpDialog({ open, onClose }: Props) {
  return (
    <Dialog open={open} onClose={onClose} title="FEA Pro — guida rapida" width={620}>
      <div className="space-y-5">
        {/* Shortcuts section */}
        <section>
          <div className="font-mono text-[10px] uppercase tracking-wide-2 text-ink-3 font-semibold mb-3">
            Scorciatoie tastiera
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-1.5">
            {SHORTCUTS.map((s) => (
              <div key={s.keys} className="flex items-center gap-2.5">
                <kbd className="font-mono text-[10px] bg-bg-panel border border-border-light text-ink px-1.5 py-0.5 min-w-[64px] text-center font-medium">
                  {s.keys}
                </kbd>
                <span className="text-sm text-ink-2">{s.description}</span>
              </div>
            ))}
          </div>
        </section>

        {FEATURES.map((f) => (
          <section key={f.area}>
            <div className="font-mono text-[10px] uppercase tracking-wide-2 text-ink-3 font-semibold mb-2">
              {f.area}
            </div>
            <ul className="space-y-1 text-sm text-ink-2 leading-relaxed">
              {f.items.map((i) => (
                <li key={i} className="flex gap-2.5">
                  <span className="text-accent flex-shrink-0 mt-0.5">·</span>
                  <span>{i}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <div className="border-t border-border pt-3 font-mono text-[10px] uppercase tracking-wide-1 text-ink-3">
          API docs: <span className="text-ink-2 normal-case tracking-normal">localhost:8000/docs</span> · Repo:{" "}
          <span className="text-ink-2 normal-case tracking-normal">fea-pro</span>
        </div>
      </div>
    </Dialog>
  );
}
