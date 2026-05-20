/**
 * TipBubble — micro-tooltip per concetti normativi/numerici nei form.
 *
 * Uso:
 *   <label>Winkler k <TipBubble tipId="winkler-k" /></label>
 *
 * Pesca il contenuto da `INLINE_TIPS` in `help/content.ts`. Render con Radix Tooltip
 * (delay corto, side="top"). Se l'id non esiste, fallisce silenziosamente.
 */
import { Info } from "lucide-react";
import { Tooltip } from "./Tooltip";
import { INLINE_TIPS } from "../../help/content";

interface Props {
  tipId: string;
  /** Sovrascrive il contenuto (override puntuale). */
  content?: string;
  className?: string;
}

export function TipBubble({ tipId, content, className }: Props) {
  const md = content ?? INLINE_TIPS[tipId];
  if (!md) return null;
  return (
    <Tooltip content={<span className="text-[11px] leading-snug max-w-[280px] block">{md}</span>}>
      <span
        className={`inline-flex items-center align-middle text-ink-dim hover:text-ink cursor-help ${className ?? ""}`}
        aria-label={`Tip: ${tipId}`}
      >
        <Info className="h-3 w-3" />
      </span>
    </Tooltip>
  );
}
