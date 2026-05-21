/**
 * AICopilotButton (alpha.18) — Sprint 4 / Asse G3.
 *
 * Pulsante AI Copilot accent purple (mockup v1.3). In alpha.18 e' un
 * placeholder: click apre un toast "soon" che indica dove configurare
 * (env GEMINI_API_KEY) e quando arrivera' (Sprint 5).
 *
 * Stato visivo: solo icona Sparkles su mobile, icona+label "AI" su
 * desktop, tooltip esplicativo.
 */
import { Sparkles } from "lucide-react";
import { Tooltip } from "../../ui/Tooltip";
import { toast } from "../../../store/toastStore";


export function AICopilotButton() {
  return (
    <Tooltip
      content={
        <div>
          <div className="font-semibold flex items-center gap-1.5">
            AI Copilot
            <span className="chip chip-purple text-[9px]">soon</span>
          </div>
          <div className="text-ink-muted text-[11px] mt-0.5">
            Debug FEM, spiegazione errori, suggerimenti
          </div>
        </div>
      }
    >
      <button
        type="button"
        aria-label="AI Copilot"
        data-testid="topbar-ai"
        onClick={() => {
          toast("info", "AI Copilot disponibile da v1.5 (Sprint 5).");
        }}
        className={[
          "flex items-center gap-1.5 h-7 px-2 rounded-md",
          "text-ink-purple hover:bg-bg-purple transition-colors",
          "border border-transparent hover:border-purple/30",
          "focus:outline-none focus:ring-2 focus:ring-purple/60",
        ].join(" ")}
      >
        <Sparkles className="h-3.5 w-3.5" strokeWidth={1.8} />
        <span className="hidden md:inline text-xs font-medium">AI</span>
      </button>
    </Tooltip>
  );
}
