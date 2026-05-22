/**
 * PercorsiPlaceholderDialog (v1.8 T2).
 *
 * Mini-dialog informativo per il placeholder "Percorsi" fino al Demo
 * Slice v1.9. Mostra i 3 claim del prodotto dal mockup_pack v0.3 #02:
 *   - Step-by-step
 *   - Algorithmic guidance
 *   - Always in control
 *
 * Escape hatch: bottone "Apri Studio Pro" (chiude il dialog + apre
 * dialog NewModel). Coerente con regola UI "no crocette" (dismiss ESC,
 * backdrop, swipe-back).
 */
import { Dialog } from "./Dialog";
import { useModalBackButton } from "../../hooks/useModalBackButton";
import { Sparkles, Workflow, ShieldCheck } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
}

const CLAIMS = [
  {
    Icon: Workflow,
    title: "Step-by-step",
    desc: "Form semplici, preview live, draft auto-salvati. L'utente capisce sempre dove e' e dove va.",
  },
  {
    Icon: Sparkles,
    title: "Algorithmic guidance",
    desc: "Suggerimenti deterministici basati su rule-engine (algoritmo > AI). Niente black box.",
  },
  {
    Icon: ShieldCheck,
    title: "Always in control",
    desc: "Ogni passo ha un escape hatch verso Studio Pro per controlli avanzati.",
  },
];

export function PercorsiPlaceholderDialog({ open, onClose }: Props) {
  useModalBackButton(open, onClose);

  return (
    <Dialog open={open} onClose={onClose} title="Percorsi" width={520}>
      <div className="space-y-4">
        <div className="bg-bg-percorsi border border-percorsi/30 rounded-md p-3">
          <div className="text-[10px] uppercase tracking-wider font-mono font-semibold text-ink-percorsi mb-1">
            Disponibili da v1.9
          </div>
          <div className="text-sm text-ink leading-snug">
            I Percorsi guidano dall'idea al report passando per geometria,
            carichi, run e verifica criticita'. Demo Slice in arrivo: il
            primo Percorso killer e' <strong>"Verifica telaio 2D"</strong>.
          </div>
        </div>

        <div>
          <div className="text-[10px] uppercase tracking-wider text-ink-muted font-mono font-semibold mb-2">
            Cosa aspettarsi
          </div>
          <div className="space-y-2">
            {CLAIMS.map((c) => (
              <div key={c.title} className="flex items-start gap-2.5 text-xs">
                <div className="w-7 h-7 rounded-md bg-bg-percorsi text-ink-percorsi flex items-center justify-center flex-shrink-0">
                  <c.Icon className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-ink">{c.title}</div>
                  <div className="text-ink-muted leading-snug">{c.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-2 border-t border-border">
          <button
            type="button"
            onClick={() => {
              onClose();
              window.dispatchEvent(new Event("feapro:open-new-model"));
            }}
            data-testid="percorsi-fallback-studio-pro"
            className="w-full text-center bg-accent text-white py-2 rounded-md text-sm font-medium hover:bg-accent-hover transition-colors"
          >
            Apri Studio Pro (modalita' esperto)
          </button>
          <div className="text-[10px] text-ink-muted text-center mt-2">
            Studio Pro e Percorsi sono due porte sullo stesso modello.
          </div>
        </div>
      </div>
    </Dialog>
  );
}
