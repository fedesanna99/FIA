/**
 * TrustLayerBadge (Precision v2.0) — banner "DRAFT/Preliminary" del Trust Layer.
 *
 * Mockup C7 di handoff Claude Design. Onesty layer: il report di FEA Pro è
 * sempre marcato come bozza finché un professionista qualificato non lo firma.
 * Due forme:
 *   - "inline":    chip warn piccolo (per inline in ModelInfoCard)
 *   - "banner":    banner full-width (per intestazioni report)
 *   - "watermark": watermark grafico SVG da sovrapporre alla preview PDF
 *
 * Animations:
 *   - Banner mount: `animate-slide-down` (220ms) — entra dall'alto
 *   - Watermark: `animate-fade-in` lento, poi statico (no pulse cronico,
 *     resta dichiarazione legale)
 *
 * Esempi:
 *   <TrustLayerBadge variant="inline" />
 *   <TrustLayerBadge variant="banner" qualifiedBy="Ing. Mario Rossi · OdI Roma A1234" />
 *   <TrustLayerBadge variant="watermark" />
 */
import { ShieldAlert, ShieldCheck } from "lucide-react";
import { Chip } from "../ui";
import { cn } from "../ui/cn";

type Variant = "inline" | "banner" | "watermark";

interface Props {
  variant?: Variant;
  /** Se valorizzato, mostra "Firmato da {qualifiedBy}" + tone success. */
  qualifiedBy?: string;
  className?: string;
}

export function TrustLayerBadge({ variant = "inline", qualifiedBy, className }: Props) {
  const signed = !!qualifiedBy;

  if (variant === "inline") {
    return signed ? (
      <Chip
        tone="success"
        icon={<ShieldCheck className="w-3 h-3" strokeWidth={2.5} aria-hidden="true" />}
        className={className}
        data-testid="trust-badge-inline-signed"
      >
        Firmato
      </Chip>
    ) : (
      <Chip
        tone="warn"
        icon={<ShieldAlert className="w-3 h-3" strokeWidth={2.5} aria-hidden="true" />}
        className={className}
        data-testid="trust-badge-inline-draft"
      >
        DRAFT · Preliminary
      </Chip>
    );
  }

  if (variant === "banner") {
    return (
      <div
        role="note"
        aria-label={signed ? "Report firmato" : "Trust Layer · Draft"}
        className={cn(
          "border border-border border-l-2 px-3 py-2.5 flex items-start gap-2.5 animate-slide-down",
          signed ? "border-l-success bg-bg-success/30" : "border-l-warn bg-bg-warn/30",
          className,
        )}
        data-testid={signed ? "trust-banner-signed" : "trust-banner-draft"}
      >
        {signed ? (
          <ShieldCheck className="w-4 h-4 mt-0.5 flex-shrink-0 text-success" strokeWidth={2} aria-hidden="true" />
        ) : (
          <ShieldAlert className="w-4 h-4 mt-0.5 flex-shrink-0 text-warn" strokeWidth={2} aria-hidden="true" />
        )}
        <div className="min-w-0 flex-1 text-base leading-relaxed">
          {signed ? (
            <>
              <span className="font-semibold text-ink">Firmato</span>
              <span className="text-ink-2"> da {qualifiedBy}. Il report è valido come elaborato professionale.</span>
            </>
          ) : (
            <>
              <span className="font-semibold text-ink">DRAFT · Preliminary.</span>
              <span className="text-ink-2"> Il calcolo è tracciabile e riproducibile. La validità professionale richiede la firma di un tecnico abilitato.</span>
            </>
          )}
        </div>
      </div>
    );
  }

  // watermark · SVG diagonale grande, da assolute-position sopra una preview PDF
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden animate-fade-in",
        className,
      )}
      data-testid="trust-watermark"
    >
      <svg
        viewBox="0 0 800 1000"
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full opacity-[0.06]"
      >
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="middle"
          transform="rotate(-32 400 500)"
          fontFamily="Inter Tight, sans-serif"
          fontSize="220"
          fontWeight="700"
          fill="currentColor"
          className="text-warn"
          letterSpacing="20"
        >
          DRAFT
        </text>
        <text
          x="50%"
          y="60%"
          textAnchor="middle"
          dominantBaseline="middle"
          transform="rotate(-32 400 600)"
          fontFamily="JetBrains Mono, monospace"
          fontSize="36"
          fill="currentColor"
          className="text-warn"
          letterSpacing="10"
        >
          PRELIMINARY · NON FIRMATO
        </text>
      </svg>
    </div>
  );
}
