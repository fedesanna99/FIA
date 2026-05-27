/**
 * ShowcaseBanner · v2.9.2 Sprint D M9
 *
 * Banner di disclaimer per le pagine `/design/*` (DialogsShowcase,
 * StatesShowcase, MobileShowcase). Avverte l'utente che la pagina  un
 * demo del design system, non una feature production.
 *
 * Fix di M9 (audit-mockup-completeness): le 3 pagine showcase erano
 * ambigue per utente loggato che vedeva button no-op senza capire
 * il motivo. Ora il banner chiarisce il context.
 */
import { Link } from "react-router-dom";
import { Info } from "lucide-react";


export function ShowcaseBanner({ pageName }: { pageName: string }): JSX.Element {
  return (
    <div style={{
      position: "fixed",
      top: 0, left: 0, right: 0,
      zIndex: 100,
      background: "var(--bg-warn)",
      borderBottom: "1px solid rgba(180,83,9,0.30)",
      color: "var(--warn)",
      padding: "8px 16px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      fontFamily: "var(--font-mono)",
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: "0.05em",
      textTransform: "uppercase",
    }}>
      <Info size={14} />
      <span>
        DESIGN SYSTEM SHOWCASE · {pageName} è una pagina dimostrativa.
        I button sono illustrativi, non funzionali.
        <Link to="/about" style={{ marginLeft: 12, color: "var(--warn)", textDecoration: "underline" }}>
          Cos'è FEA Pro?
        </Link>
      </span>
    </div>
  );
}
