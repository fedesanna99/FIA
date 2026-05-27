/**
 * LegalPage · v2.8.1 Sprint A M3 mockup-driven
 *
 * Pagine legali base per compliance (Privacy / Terms / About / Preliminary).
 * Reusa lo stesso wrapper `.sett` di SettingsPage per consistency visuale
 * (topbar minimal + content max-width readable).
 *
 * Route: /privacy /terms /about /preliminary (4 totali).
 */
import { Link, useLocation } from "react-router-dom";

import "../styles/settings.css";


type LegalKind = "privacy" | "terms" | "about" | "preliminary";

interface LegalContent {
  eyebrow: string;
  h1: string;
  intro: string;
  sections: ReadonlyArray<{ title: string; body: string }>;
}


const CONTENT: Record<LegalKind, LegalContent> = {
  privacy: {
    eyebrow: "FEA PRO · PRIVACY POLICY",
    h1: "Privacy Policy",
    intro:
      "FEA Pro tratta i dati strutturali dei tuoi modelli e i dati di account secondo il GDPR (Regolamento UE 2016/679). Questo documento descrive cosa raccogliamo, perché, e come puoi esercitare i tuoi diritti.",
    sections: [
      {
        title: "Dati raccolti",
        body:
          "Account: email, nome/cognome (opzionale), ruolo professionale, password hashed (bcrypt). Modelli: geometria, vincoli, carichi, materiali, risultati analisi. Telemetria: log accesso, errori solver, durata sessione. NON raccogliamo dati biometrici, di pagamento (gestito da Stripe), o di geolocalizzazione precisa.",
      },
      {
        title: "Finalità del trattamento",
        body:
          "Erogazione del servizio (login, salvataggio modelli, esecuzione solver). Sicurezza (rate limiting, anti-abuse). Miglioramento del prodotto (telemetria anonimizzata sui solver più usati).",
      },
      {
        title: "Conservazione",
        body:
          "Account: per la durata della relazione contrattuale + 10 anni (obblighi fiscali). Modelli: indefinitamente finché non li elimini esplicitamente. Log: 90 giorni rolling.",
      },
      {
        title: "Diritti dell'interessato",
        body:
          "Accesso, rettifica, cancellazione, portabilità, opposizione. Scrivi a privacy@feapro.it per esercitare i tuoi diritti GDPR Art. 15-22.",
      },
      {
        title: "Titolare del trattamento",
        body:
          "FEA Pro S.r.l. (in fase di costituzione). Contatto: privacy@feapro.it. DPO: TBD. Reclami all'autorità garante: garanteprivacy.it.",
      },
    ],
  },
  terms: {
    eyebrow: "FEA PRO · TERMINI DI SERVIZIO",
    h1: "Termini e Condizioni",
    intro:
      "Usando FEA Pro accetti questi termini. Il software è in fase Preliminary (alpha): non rilasciare risultati a clienti reali senza verifica indipendente.",
    sections: [
      {
        title: "Licenza d'uso",
        body:
          "Tier Free: 5 progetti attivi, 13 tipi di elementi, normative EC3 + NTC. Tier Pro: illimitato. Open-source GPLv3 per il solver engine; closed-source per UI premium.",
      },
      {
        title: "Limitazioni di responsabilità",
        body:
          "I risultati del solver sono indicativi. FEA Pro NON sostituisce la responsabilità professionale dell'ingegnere strutturista. Eventuali errori di calcolo non implicano responsabilità di FEA Pro S.r.l. — sei tu, in qualità di tecnico abilitato, a firmare i progetti.",
      },
      {
        title: "Backup dati",
        body:
          "I tuoi modelli sono replicati su 2 region Fly.io. Backup esportabile in JSON anytime dal workspace I/O. Non garantiamo recovery di modelli eliminati esplicitamente.",
      },
      {
        title: "Modifica dei termini",
        body:
          "Possiamo modificare questi termini con preavviso 30 giorni via email. Continuare a usare il servizio dopo la modifica implica accettazione.",
      },
      {
        title: "Foro competente",
        body:
          "Foro di Milano. Legge italiana applicabile. Eventuali controversie sono risolte tramite mediazione obbligatoria prima del giudizio.",
      },
    ],
  },
  about: {
    eyebrow: "FEA PRO · ABOUT",
    h1: "Cos'è FEA Pro?",
    intro:
      "FEA Pro è un FEM web studio open-source per ingegneri strutturisti. Modella, analizza, verifica strutture nel browser senza installare software desktop.",
    sections: [
      {
        title: "Capabilities",
        body:
          "13 tipi di elementi (beam, truss, shell Q4, solid H8, ...). 10 solver (statica lineare, modale ARPACK, Newmark dinamica, buckling, push-over, sismica time-history, fatica Rainflow). Normative EC2/EC3/EC5/EC8 + NTC 2018.",
      },
      {
        title: "Tech stack",
        body:
          "React 18 + TypeScript + Three.js (viewport). FastAPI Python + NumPy/SciPy + ARPACK (solver). SQLite + Fly.io single-image deploy. Open-source GPLv3 (frontend + solver). Stripe per billing Pro tier.",
      },
      {
        title: "Filosofia",
        body:
          "Trasparenza algoritmica (vedi tutti i passaggi del calcolo). Onestà sopra il marketing (no overpromising). Verifiche EC riga per riga (non black-box). Dati tuoi, non li monetizziamo.",
      },
      {
        title: "Team & contatti",
        body:
          "Founder: Federico Sanna (ingegnere strutturista). Domande: ciao@feapro.it. GitHub: github.com/fedesanna99/FIA. Bug report: docs/HANDOFF_MESSAGE.md o issue tracker su GitHub.",
      },
      {
        title: "Versione attuale",
        body:
          "v2.8.1 (Sprint A · Phase 4-6 mockup-driven). Roadmap: docs/ROADMAP_2026-05.md.",
      },
    ],
  },
  preliminary: {
    eyebrow: "FEA PRO · STATO PRELIMINARY",
    h1: "Cosa significa \"Preliminary\"?",
    intro:
      "Il badge giallo \"Preliminary\" che vedi in topbar dei workspace Studio indica lo stato del modello e della sua catena di calcolo.",
    sections: [
      {
        title: "3 stati di un modello",
        body:
          "PRELIMINARY (giallo): modello creato, mai validato. I risultati del solver sono indicativi, non rilasciare a cliente. DRAFT (cyan): modello in revisione interna, solver eseguito ma non verificato per cross-check. VALIDATED (verde): modello con cross-check indipendente eseguito + UR verificate manualmente. Solo VALIDATED  appropriato per rilascio.",
      },
      {
        title: "Come passare da Preliminary a Validated",
        body:
          "1. Esegui auto-detect (rail F3) per check geometria. 2. Esegui solver almeno 2 volte con seed diversi (statica + modale). 3. Cross-check manuale risultati vs teoria (per UC1: M_max = qL²/8). 4. Esegui verifiche EC3/EC8 e controlla UR. 5. Marca il modello come Validated dal menu utente.",
      },
      {
        title: "Perché ci tieni",
        body:
          "Le responsabilit professionali (firma del progettista) richiedono che i calcoli FEM siano validati. FEA Pro mette il badge giallo per ricordarti che il calcolo non  ancora stato cross-checked. Anche un solver perfetto può dare risultati sbagliati se l'input  errato.",
      },
      {
        title: "Disclaimer legale",
        body:
          "FEA Pro non sostituisce la responsabilit professionale. Tutti i risultati Preliminary devono essere verificati manualmente prima del rilascio. Vedi /terms §Limitazioni di responsabilit.",
      },
    ],
  },
};


export function LegalPage(): JSX.Element {
  const location = useLocation();
  // Estrai kind dal pathname (/privacy → "privacy"). Fallback a "privacy".
  const kind = (location.pathname.replace(/^\//, "").split("/")[0] ?? "privacy") as LegalKind;
  const content = CONTENT[kind] ?? CONTENT.privacy;

  return (
    <div className="sett">
      <header className="st-topbar">
        <Link className="st-brand" to="/">
          <span className="st-brand-square">F</span>
          <span className="st-brand-name">FEA Pro</span>
        </Link>
        <div className="st-bc">
          <Link to="/">Home</Link>
          <span className="st-sep">/</span>
          <span className="st-bc-now">{content.h1}</span>
        </div>
        <div className="st-spacer" />
      </header>

      <main className="st-content" style={{ maxWidth: 760, margin: "0 auto", padding: "40px 32px 64px" }}>
        <header className="content-head">
          <span className="eyebrow">{content.eyebrow}</span>
          <h1>{content.h1}</h1>
          <p>{content.intro}</p>
        </header>

        {content.sections.map((s) => (
          <section key={s.title} className="content-section">
            <header className="section-head">
              <h2>{s.title}</h2>
            </header>
            <p style={{ fontSize: 14, lineHeight: 22, color: "var(--ink-muted)", letterSpacing: "-0.005em", margin: 0 }}>
              {s.body}
            </p>
          </section>
        ))}

        <section className="content-section">
          <p style={{ fontSize: 12, color: "var(--ink-dim)", margin: 0, fontStyle: "italic" }}>
            Ultimo aggiornamento: 2026-05-27 · v2.8.1
          </p>
        </section>
      </main>
    </div>
  );
}
