// v3.4 Fetta E2.5d (29/05 sera) · 4 route mancanti come pagine placeholder onesti.
//
// Le 4 route `/modelli` `/jobs` `/cronologia` `/docs` erano segnalate con
// TODO inline nella Fetta E2.1 (topbar 3 icone Home/Modelli/Jobs) e in
// AvatarMenu (voci Cronologia/Docs del menu profilo). Pattern "additivo
// prima, sottrattivo dopo" della Fetta E2-IA: in E2.5d le creiamo come
// pagine placeholder onesti (4 stati onesti), poi quando i flussi reali
// saranno disponibili (lista modelli completa, coda jobs server-side,
// audit log, docs renderizzate) le riempiremo.
//
// Pattern componente:
//   `DashTopBar` (E3.1) come header → navigazione consistente con la
//   Dashboard, AvatarMenu, ⌘K palette
//   Empty state al centro con icona Lucide stroke 1.8, title, descrizione
//   onesta ("In arrivo" + razionale), CTA opzionale verso pagina simile
//
// Stili in `dashboard-soft.css` sezione "placeholder-*" (aggiunta in E2.5d).
// Layout coerente con `EmptyOnboarding` (E3.6) ma full-page invece di tile.

import { Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  Activity, Clock, BookOpen, ArrowRight,
} from "lucide-react";

import { DashTopBar } from "../dashboard/DashTopBar";
import { ModelsList } from "../components/shell/ModelsList";


interface PlaceholderPageProps {
  /** Lucide icon. Stroke 1.8 come convention dei tb-iconbtn. */
  icon: LucideIcon;
  /** Titolo H1 della pagina (italiano user-facing). */
  title: string;
  /** Sottotitolo onesto: cosa farà la pagina + ETA realistico. */
  description: string;
  /** Dettaglio aggiuntivo (es. dove trovare la feature oggi). */
  detail?: string;
  /** Testid stabile per E2E + onboarding tour. */
  testId: string;
  /** Path attivo nella DashTopBar (per evidenziare la voce nav). */
  activePath?: "home" | "modelli" | "jobs";
  /** CTA primaria opzionale (link alla pagina più vicina disponibile). */
  primaryCta?: { label: string; to: string };
}


function PlaceholderPage({
  icon: Icon,
  title,
  description,
  detail,
  testId,
  activePath,
  primaryCta,
}: PlaceholderPageProps) {
  return (
    <div className="dash dash-soft" data-testid={testId}>
      <DashTopBar activePath={activePath} tierLabel="FREE" />
      <main className="placeholder-main">
        <div className="placeholder-empty">
          <div className="placeholder-icon" aria-hidden>
            <Icon size={36} strokeWidth={1.5} />
          </div>
          <h1 className="placeholder-title">{title}</h1>
          <p className="placeholder-description">{description}</p>
          {detail && <p className="placeholder-detail">{detail}</p>}
          {primaryCta && (
            <Link
              to={primaryCta.to}
              className="placeholder-cta"
              data-testid={`${testId}-cta`}
            >
              {primaryCta.label}
              <ArrowRight size={14} strokeWidth={2} />
            </Link>
          )}
        </div>
      </main>
    </div>
  );
}


/** /modelli — lista completa modelli utente (MOD-1, 31/05/2026).
 *  Era placeholder "in arrivo" pre-MOD-1. Ora page route reale che riusa
 *  il componente puro `<ModelsList />` (estratto da ModelliBrowser overlay
 *  legacy nello stesso refactor). DashTopBar consistente con resto
 *  dell'app + URL `/modelli` condivisibile/bookmark-able. */
export function ModelliPage() {
  return (
    <div className="dash dash-soft" data-testid="page-modelli">
      <DashTopBar activePath="modelli" tierLabel="FREE" />
      <main>
        <ModelsList />
      </main>
    </div>
  );
}


/** /jobs — coda processi (analisi in esecuzione + storico esiti). */
export function JobsPage() {
  return (
    <PlaceholderPage
      icon={Activity}
      title="Jobs"
      description="La coda dei processi server-side (analisi in esecuzione, completate, fallite) sarà disponibile quando l'analisi remota sarà rilasciata."
      detail="Per ora le analisi sono in-process: il loro stato è visibile in tempo reale nella spina 'Esegui' del workspace."
      testId="placeholder-jobs"
      activePath="jobs"
      primaryCta={{ label: "Torna alla Dashboard", to: "/" }}
    />
  );
}


/** /cronologia — audit log azioni utente (apertura/modifica/analisi/export). */
export function CronologiaPage() {
  return (
    <PlaceholderPage
      icon={Clock}
      title="Cronologia"
      description="Lo storico delle tue azioni (apertura modelli, modifiche, analisi eseguite, export) sarà disponibile con il prossimo rilascio."
      detail="Per ora c'è la cronologia interna del modello (undo/redo) raggiungibile da ⌘K → 'Annulla' / 'Ripeti', e i Recenti della Dashboard."
      testId="placeholder-cronologia"
      primaryCta={{ label: "Torna alla Dashboard", to: "/" }}
    />
  );
}


/** /docs — documentazione utente (guide, esempi, riferimenti normativi). */
export function DocsPage() {
  return (
    <PlaceholderPage
      icon={BookOpen}
      title="Docs"
      description="La documentazione utente (guide ai workflow, esempi commentati, riferimenti normativi NTC/EC) sarà disponibile con il prossimo rilascio."
      detail="Per ora trovi le pagine legali (privacy, terms, about) nel footer, e l'onboarding tour si riattiva dal '?' nella topbar."
      testId="placeholder-docs"
      primaryCta={{ label: "Esplora i Template", to: "/templates" }}
    />
  );
}
