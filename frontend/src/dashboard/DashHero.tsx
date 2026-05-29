/**
 * DashHero · Fetta E3.2 (redesign workspace-fasi)
 *
 * Hero sobrio della Dashboard: eyebrow greeting dinamico + h1 stabile +
 * sub variante per stato (A abituale / B quota >80% / C primo accesso).
 *
 * Replica mockup Claude Design Round 2 (Handoff 05) `Dashboard.html`
 * sezione `<section class="dash-hero">`. Stili in `dashboard-soft.css`.
 *
 * Differenze rispetto al vecchio Hero v2.7.1 (rimosso):
 *   - Niente "X progetti in lavorazione · N percorsi · ultima sessione"
 *     metadati inline → spostati in altre sezioni (RecentsCarousel ha
 *     "Riprendi" come tile dedicato, vedi E3.4)
 *   - Niente usage card embedded → spostata in QuotaBanner (E3.7) +
 *     pagina /settings/billing (E3.8)
 *   - h1 stabile ("Da dove ricominci?") invece di "Da dove ricominci<br />oggi?"
 *     (decisione Federico+Claude Design: greeting eyebrow non in h1)
 */
import { useMemo, type ReactNode } from "react";

export type DashHeroState = "A" | "B" | "C";

export interface DashHeroProps {
  greeting: string;
  firstName: string;
  state: DashHeroState;
  /** Riprendi target — modello attivo per il link in sub-A. Null = fallback testuale. */
  latestModel?: { id: string; name: string } | null;
  /** Callback opzionale quando l'utente clicca sul link "Riprendi" in sub-A. */
  onResume?: (modelId: string) => void;
  /** Callback opzionale per "Libera spazio" in sub-B (apre dialog archive). */
  onArchive?: () => void;
}

export function DashHero({ greeting, firstName, state, latestModel, onResume, onArchive }: DashHeroProps) {
  const sub = useMemo<ReactNode>(() => {
    if (state === "B") {
      return (
        <>
          Hai quasi esaurito il piano Free.{" "}
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              onArchive?.();
            }}
          >
            Libera spazio
          </a>{" "}
          archiviando un modello, oppure passa a Pro.
        </>
      );
    }
    if (state === "C") {
      return (
        <>
          Primo accesso. Parti da un caso semplice qui sotto — bastano due
          minuti per arrivare a un risultato verificato.
        </>
      );
    }
    // state === "A" (default abituale)
    if (latestModel) {
      return (
        <>
          Riprendi{" "}
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              onResume?.(latestModel.id);
            }}
            data-testid="hero-resume-link"
          >
            {latestModel.name}
          </a>
          , apri un template configurato a norma, o costruisci un modello da zero.
        </>
      );
    }
    // fallback narrativo se A ma no latestModel (improbabile, ma graceful)
    return (
      <>Apri un template configurato a norma, o costruisci un modello da zero.</>
    );
  }, [state, latestModel, onResume, onArchive]);

  return (
    <section className="dash-hero" data-testid="dash-hero" data-state={state}>
      <span className="eyebrow" data-testid="hero-greeting">
        {greeting} · {firstName}
      </span>
      <h1>Da dove ricominci?</h1>
      <p className="hero-sub">{sub}</p>
    </section>
  );
}
