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
  { keys: "Del / Backspace", description: "Elimina selezione" },
  { keys: "Esc", description: "Deseleziona tutto" },
  { keys: "F5 / Ctrl+Enter", description: "Esegui analisi corrente" },
  { keys: "Shift + Click", description: "Aggiungi alla selezione" },
];

const FEATURES: { area: string; items: string[] }[] = [
  {
    area: "Modellazione",
    items: [
      "Trascina un file .json nel viewport per importare un modello",
      "Click ⎘ Duplica per partire da un esempio",
      "Click ✎ Modifica per cambiare nome/unità del modello",
      "Hover su nodo o elemento → tooltip flottante con info e risultati",
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
      "Stress colormap (Jet) · Diagrammi N/V/M · Vettori σ₁/σ₂ principali",
      "Timeline HUD per scrubbing della risposta dinamica",
    ],
  },
  {
    area: "Export",
    items: ["JSON modello+risultati · CSV tabelle · DXF geometria · 📄 Report PDF"],
  },
];

export function HelpDialog({ open, onClose }: Props) {
  return (
    <Dialog open={open} onClose={onClose} title="FEA Pro — guida rapida" width={580}>
      <div className="space-y-4 text-xs">
        <section>
          <div className="text-[10px] uppercase tracking-wider text-ink-muted mb-2">Scorciatoie tastiera</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            {SHORTCUTS.map((s) => (
              <div key={s.keys} className="flex items-center gap-2">
                <kbd className="bg-bg border border-border rounded px-1.5 py-0.5 numeric text-[10px] min-w-[90px] text-center">
                  {s.keys}
                </kbd>
                <span className="text-ink-muted">{s.description}</span>
              </div>
            ))}
          </div>
        </section>

        {FEATURES.map((f) => (
          <section key={f.area}>
            <div className="text-[10px] uppercase tracking-wider text-ink-muted mb-1">{f.area}</div>
            <ul className="space-y-0.5 text-ink-muted">
              {f.items.map((i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-accent-primary">·</span>
                  <span>{i}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <div className="border-t border-border pt-2 text-ink-dim text-[10px]">
          API docs: <span className="numeric">http://localhost:8000/docs</span> ·{" "}
          Repo: <span className="numeric">fea-pro</span>
        </div>
      </div>
    </Dialog>
  );
}
