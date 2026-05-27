/**
 * StudioEmptyBanner · v3.0.0 Sprint E M10
 *
 * Banner che appare nei 4 Studio workspace quando l'utente non ha
 * ancora aperto nessun modello (modelId === null da useFirstModelId).
 *
 * Fix M10 audit mockup-completeness: prima dei Sprint A-D, click su
 * "Genera mesh" / "Esegui" / "Esporta" davano toast "Apri prima Templates"
 * ma senza un CTA chiaro in-page. Ora il banner spiega cosa fare con
 * link diretto a /templates + /percorsi/uc1.
 */
import { Link } from "react-router-dom";
import { ArrowRight, BookOpen } from "lucide-react";


export function StudioEmptyBanner(): JSX.Element {
  return (
    <div
      style={{
        margin: "16px 28px",
        padding: "16px 20px",
        background: "var(--bg-info)",
        border: "1px solid rgba(var(--accent-rgb), 0.30)",
        borderRadius: 12,
        display: "flex",
        alignItems: "center",
        gap: 16,
        flexWrap: "wrap",
      }}
    >
      <BookOpen size={20} style={{ color: "var(--accent)", flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <h3 style={{
          fontFamily: "var(--font-display)",
          fontSize: 14,
          fontWeight: 700,
          color: "var(--ink)",
          margin: 0,
          letterSpacing: "-0.01em",
        }}>
          Nessun modello aperto
        </h3>
        <p style={{
          fontSize: 12,
          color: "var(--ink-muted)",
          margin: "2px 0 0",
          letterSpacing: "-0.005em",
        }}>
          Per usare questo workspace serve un modello attivo. Inizia da un template o segui il percorso UC1.
        </p>
      </div>
      <Link
        to="/templates"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "8px 14px",
          background: "var(--accent)",
          color: "#FFFFFF",
          fontFamily: "var(--font-sans)",
          fontSize: 12,
          fontWeight: 700,
          borderRadius: 8,
          textDecoration: "none",
          flexShrink: 0,
        }}
      >
        Apri Templates
        <ArrowRight size={12} strokeWidth={2.4} />
      </Link>
      <Link
        to="/percorsi/uc1"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "8px 14px",
          background: "var(--bg-panel)",
          color: "var(--ink)",
          fontFamily: "var(--font-sans)",
          fontSize: 12,
          fontWeight: 700,
          borderRadius: 8,
          textDecoration: "none",
          border: "1px solid var(--border)",
          flexShrink: 0,
        }}
      >
        Percorso UC1
        <ArrowRight size={12} strokeWidth={2.4} />
      </Link>
    </div>
  );
}
