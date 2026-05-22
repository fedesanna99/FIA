/**
 * AICopilotButton (alpha.18) — Sprint 4 / Asse G3.
 *
 * Pulsante AI Copilot accent purple (mockup v1.3). Apre la sub-view AI
 * dentro Tools, cosi' la feature backend resta raggiungibile dalla shell.
 *
 * Stato visivo: solo icona Sparkles su mobile, icona+label "AI" su
 * desktop, tooltip esplicativo.
 */
import { Sparkles } from "lucide-react";
import { Tooltip } from "../../ui/Tooltip";
import { useRightRailStore } from "../../../store/rightRailStore";


export function AICopilotButton() {
  return (
    <Tooltip
      content={
        <div>
          <div className="font-semibold flex items-center gap-1.5">
            AI Copilot
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
          useRightRailStore.getState().open("tools");
          window.setTimeout(() => {
            window.dispatchEvent(new CustomEvent("feapro:tools-view", { detail: { view: "ai-copilot" } }));
          }, 0);
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
