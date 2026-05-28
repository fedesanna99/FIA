/**
 * SettingsPage · v2.8.0 Phase 6.2 mockup-driven
 *
 * Replica condensata di Settings.html: Topbar + sidebar nav 3 sezioni
 * (Profilo/Avanzato/Sistema) + content Account tab (Identity card + fields).
 *
 * Route: /settings dentro AuthGate.
 */
import { useEffect, useState } from "react";
import {
  BadgeCheck, Bell, CreditCard, Key, KeyRound, LogOut, Mail, Settings as SettingsIcon,
  User, UserCircle, Weight,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";

import { useAuthStore } from "../store/authStore";

import "../styles/settings.css";


type Section = "account" | "profile" | "billing" | "api" | "prefs" | "units" | "shortcuts" | "about" | "logout";

const VALID_SECTIONS = new Set<Section>([
  "account", "profile", "billing", "api", "prefs", "units", "shortcuts", "about", "logout",
]);

function parseSection(raw: string | null): Section {
  if (raw && VALID_SECTIONS.has(raw as Section)) return raw as Section;
  return "account";
}


export function SettingsPage(): JSX.Element {
  // v3.1.1 audit-fix L2-2: leggi `?section=billing` per consentire deep-link
  // dalla Dashboard (es. "Scopri Pro" → /settings?section=billing). Default
  // su "account" se param assente o non riconosciuto.
  const [searchParams] = useSearchParams();
  const [active, setActive] = useState<Section>(() => parseSection(searchParams.get("section")));
  // Reagisce a navigate() successivi (in-app navigation) cambiando tab live.
  useEffect(() => {
    const next = parseSection(searchParams.get("section"));
    setActive(next);
  }, [searchParams]);
  const user = useAuthStore((s) => s.user);
  // v2.8.1 Sprint A M6: fallback non hardcoded. Se user  null
  // (logout in corso), mostro placeholder neutro invece di "Federico Sanna".
  const initials = user?.email ? user.email.slice(0, 2).toUpperCase() : "??";
  const displayNome = user?.nome ?? "—";
  const displayCognome = user?.cognome ?? "—";
  const displayEmail = user?.email ?? "—";
  const displayRuolo = user?.ruolo_professionale
    ? user.ruolo_professionale.charAt(0).toUpperCase() + user.ruolo_professionale.slice(1)
    : "—";

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
          <span className="st-bc-now">Impostazioni</span>
        </div>
        <div className="st-spacer" />
        <button type="button" className="st-avatar">{initials}</button>
      </header>

      <div className="st-mid">

        <nav className="st-side">
          <div className="side-section">
            <span className="eyebrow">PROFILO</span>
            <SideItem icon={<User size={15} />} label="Account" active={active === "account"} onClick={() => setActive("account")} />
            <SideItem icon={<UserCircle size={15} />} label="Profilo" active={active === "profile"} onClick={() => setActive("profile")} />
            <SideItem icon={<CreditCard size={15} />} label="Billing & tier" active={active === "billing"} onClick={() => setActive("billing")} />
          </div>

          <div className="side-section">
            <span className="eyebrow">AVANZATO</span>
            <SideItem icon={<Key size={15} />} label="API keys" active={active === "api"} onClick={() => setActive("api")} />
            <SideItem icon={<SettingsIcon size={15} />} label="Preferenze" active={active === "prefs"} onClick={() => setActive("prefs")} />
            <SideItem icon={<Weight size={15} />} label="Unità di misura" active={active === "units"} onClick={() => setActive("units")} />
            <SideItem icon={<KeyRound size={15} />} label="Scorciatoie" active={active === "shortcuts"} onClick={() => setActive("shortcuts")} />
          </div>

          <div className="side-section">
            <span className="eyebrow">SISTEMA</span>
            <SideItem icon={<Bell size={15} />} label="About & version" active={active === "about"} onClick={() => setActive("about")} />
            <button type="button" className="side-item side-item-danger" onClick={() => window.dispatchEvent(new Event("feapro:logout"))}>
              <LogOut size={15} />
              Esci
            </button>
          </div>
        </nav>

        <main className="st-content">
          {active === "account" && (
            <AccountSection
              user={user}
              initials={initials}
              displayNome={displayNome}
              displayCognome={displayCognome}
              displayEmail={displayEmail}
              displayRuolo={displayRuolo}
            />
          )}
          {active === "profile" && <ProfileSection user={user} />}
          {active === "billing" && <BillingSection />}
          {active === "api" && <ApiKeysSection />}
          {active === "prefs" && <PreferencesSection />}
          {active === "units" && <UnitsSection />}
          {active === "shortcuts" && <ShortcutsSection />}
          {active === "about" && <AboutSection />}
        </main>

      </div>
    </div>
  );
}


function SideItem({ icon, label, active, onClick }: {
  icon: JSX.Element; label: string; active: boolean; onClick: () => void;
}): JSX.Element {
  return (
    <button type="button" className={active ? "side-item is-active" : "side-item"} onClick={onClick}>
      {icon}
      {label}
    </button>
  );
}


// ── 8 Section components (v2.9.1 Sprint C M2) ───────────────────────────

interface AccountSectionProps {
  user: ReturnType<typeof useAuthStore.getState>["user"];
  initials: string;
  displayNome: string;
  displayCognome: string;
  displayEmail: string;
  displayRuolo: string;
}

function AccountSection({ user, initials, displayNome, displayCognome, displayEmail, displayRuolo }: AccountSectionProps): JSX.Element {
  return (
    <>
      <header className="content-head">
        <span className="eyebrow">PROFILO · ACCOUNT</span>
        <h1>Account</h1>
        <p>Gestisci email, password, autenticazione a due fattori e collegamento agli account social.</p>
      </header>

      <section className="content-section">
        <header className="section-head">
          <h2>Identità</h2>
          <p>Le tue informazioni di base. L'email è usata anche per il recupero password.</p>
        </header>

        <div className="content-card">
          <div className="card-row">
            <div className="card-row-l">
              <div className="user-avatar-big">{initials}</div>
              <div className="user-info">
                <h3>{displayNome} {displayCognome}</h3>
                <p>{displayEmail}</p>
                <span className="user-pill">
                  <span className="pill-dot" />
                  {user ? "Account verificato" : "Caricamento dati…"}
                </span>
              </div>
            </div>
            <div className="card-row-r">
              <button type="button" className="btn-secondary">Cambia avatar</button>
            </div>
          </div>
        </div>

        <div className="field-grid">
          <label className="field">
            <span className="field-label">Email</span>
            <div className="field-input">
              <Mail className="field-icon" size={14} />
              <input type="email" defaultValue={displayEmail} readOnly />
              <button type="button" className="field-action">Cambia</button>
            </div>
          </label>
          <label className="field">
            <span className="field-label">Nome visualizzato</span>
            <div className="field-input">
              <input type="text" defaultValue={`${displayNome} ${displayCognome}`.trim() || "—"} />
            </div>
          </label>
          <label className="field">
            <span className="field-label">Ruolo professionale</span>
            <div className="field-input">
              <input type="text" defaultValue={displayRuolo} />
            </div>
          </label>
          <label className="field">
            <span className="field-label">Lingua interfaccia</span>
            <div className="field-input">
              <select defaultValue="it">
                <option value="it">Italiano</option>
                <option value="en">English</option>
                <option value="fr">Français</option>
              </select>
            </div>
          </label>
        </div>
      </section>

      <section className="content-section">
        <header className="section-head">
          <h2>Sicurezza</h2>
          <p>Password, autenticazione a due fattori, sessioni attive.</p>
        </header>
        <div className="content-card">
          <div className="card-row">
            <div className="card-row-l">
              <BadgeCheck size={28} style={{ color: "var(--success)" }} />
              <div className="user-info">
                <h3>Password sicura</h3>
                <p>Ultima modifica: 47 giorni fa · forza: ottima</p>
              </div>
            </div>
            <div className="card-row-r">
              <button type="button" className="btn-secondary">Cambia password</button>
            </div>
          </div>
        </div>
      </section>

      <section className="content-section">
        <header className="section-head">
          <h2>Salva modifiche</h2>
        </header>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button type="button" className="btn-secondary">Annulla</button>
          <button type="button" className="btn-primary">Salva</button>
        </div>
      </section>
    </>
  );
}


function ProfileSection({ user }: { user: ReturnType<typeof useAuthStore.getState>["user"] }): JSX.Element {
  return (
    <>
      <header className="content-head">
        <span className="eyebrow">PROFILO · PROFILO</span>
        <h1>Profilo</h1>
        <p>Informazioni professionali, bio, link a social network e portfolio.</p>
      </header>
      <SectionCard
        title="Bio professionale"
        body="Descrivi brevemente la tua esperienza, settori in cui lavori, tipi di progetti che gestisci. Visibile agli altri membri del team durante le sessioni di collaborazione."
        action="Compila bio"
      />
      <SectionCard
        title="Portfolio link"
        body="Aggiungi link a LinkedIn, GitHub, sito personale, repository di progetti pubblici."
        action="Aggiungi link"
      />
      <SectionCard
        title="Certificazioni Eurocodici"
        body="Carica certificati professionali (Ordine Ingegneri, abilitazioni EC). Visibili sui report PDF generati dalle tue analisi."
        action="Carica certificato"
      />
      <SectionPending title="Status" tag="In arrivo v3.0" />
    </>
  );
}


function BillingSection(): JSX.Element {
  return (
    <>
      <header className="content-head">
        <span className="eyebrow">PROFILO · BILLING &amp; TIER</span>
        <h1>Billing &amp; tier</h1>
        <p>Gestione abbonamento, fatturazione, upgrade a Pro.</p>
      </header>
      <SectionCard
        title="Tier attuale: Free"
        body="5 progetti attivi · 13 tipi di elementi · EC3 + 9 template. Per illimitato passa a Pro."
        action="Scopri Pro · €19/mese"
      />
      <SectionCard
        title="Metodi di pagamento"
        body="Nessun metodo di pagamento salvato. Aggiungilo per attivare Pro o per le ricevute."
        action="Aggiungi carta"
      />
      <SectionCard
        title="Fatture"
        body="Cronologia fatture mensili Pro tier. Scaricabili in PDF per archivio contabile."
        action="Vedi fatture"
      />
      <SectionPending title="Status" tag="Stripe integration v3.0" />
    </>
  );
}


function ApiKeysSection(): JSX.Element {
  return (
    <>
      <header className="content-head">
        <span className="eyebrow">AVANZATO · API KEYS</span>
        <h1>API keys</h1>
        <p>Token per accesso programmatico al backend FEA Pro. Esempi d'uso: CI/CD, integrations, script Python.</p>
      </header>
      <SectionCard
        title="Crea nuova API key"
        body="Genera un token scoped (read-only / read-write / admin) con scadenza configurabile. NON esposto in chiaro dopo la creazione."
        action="Genera key"
      />
      <SectionCard
        title="Documentazione API"
        body="Endpoint REST + WebSocket. ~50 endpoint. Auth via Bearer token. Rate limit 100 req/min Free, 1000 Pro."
        action="Apri docs"
      />
      <SectionPending title="Keys attive" tag="0 token" />
    </>
  );
}


function PreferencesSection(): JSX.Element {
  return (
    <>
      <header className="content-head">
        <span className="eyebrow">AVANZATO · PREFERENZE</span>
        <h1>Preferenze</h1>
        <p>Tema, notifiche, behavior dell'editor.</p>
      </header>
      <SectionCard
        title="Tema interfaccia"
        body="Light · Dark · System (default). Cambia automaticamente in base alle preferenze OS."
        action="Light"
      />
      <SectionCard
        title="Notifiche"
        body="Email su completamento solver lunghi (>10s), commenti su modelli condivisi, fatture, security alerts."
        action="Configura"
      />
      <SectionCard
        title="Auto-save"
        body="Salvataggio automatico ogni 30 secondi durante la modifica. Disabilitabile per power user che preferiscono Ctrl+S manuale."
        action="Configura"
      />
    </>
  );
}


function UnitsSection(): JSX.Element {
  return (
    <>
      <header className="content-head">
        <span className="eyebrow">AVANZATO · UNITÀ DI MISURA</span>
        <h1>Unità di misura</h1>
        <p>Sistema di unità di default per nuovi modelli. Modificabile per modello.</p>
      </header>
      <SectionCard
        title="Sistema SI (default)"
        body="kN, m, MPa, kNm. Sistema internazionale standard EC2/EC3/EC5/EC8 + NTC18."
        action="Selezionato"
      />
      <SectionCard
        title="Sistema US (Imperial)"
        body="lb, ft, psi, lb·ft. Per progetti americani o legacy."
        action="Imposta"
      />
      <SectionCard
        title="Precisione output"
        body="Numero di cifre significative nei report: 3 (default), 4 (preciso), 5 (ricerca)."
        action="3 cifre"
      />
    </>
  );
}


function ShortcutsSection(): JSX.Element {
  return (
    <>
      <header className="content-head">
        <span className="eyebrow">AVANZATO · SCORCIATOIE TASTIERA</span>
        <h1>Scorciatoie</h1>
        <p>Tasti rapidi per workflow professionale. Personalizzabili nella v3.0.</p>
      </header>
      <div className="content-card">
        <dl className="section-kv" style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "8px 24px", fontSize: 13 }}>
          <dt><kbd>⌘ K</kbd></dt><dd>Command palette (cerca azione)</dd>
          <dt><kbd>F5</kbd></dt><dd>Esegui solver attivo</dd>
          <dt><kbd>1-5</kbd></dt><dd>Cambia workspace (Modello/Analisi/Risultati/Verifiche/IO)</dd>
          <dt><kbd>F3</kbd></dt><dd>Auto-detect issues</dd>
          <dt><kbd>?</kbd></dt><dd>Apri documentazione contestuale</dd>
          <dt><kbd>⌘ S</kbd></dt><dd>Salva modello</dd>
          <dt><kbd>⌘ Z</kbd> / <kbd>⌘ ⇧ Z</kbd></dt><dd>Undo / Redo</dd>
          <dt><kbd>⇧ Space</kbd></dt><dd>Focus mode (full-screen viewport)</dd>
          <dt><kbd>Esc</kbd></dt><dd>Chiudi dialog · esci focus mode</dd>
        </dl>
      </div>
    </>
  );
}


function AboutSection(): JSX.Element {
  return (
    <>
      <header className="content-head">
        <span className="eyebrow">SISTEMA · ABOUT &amp; VERSION</span>
        <h1>About FEA Pro</h1>
        <p>Informazioni su versione, changelog, licenze, attribuzioni.</p>
      </header>
      <SectionCard
        title="Versione attuale"
        body="v2.9.1 (Sprint C · Settings completo). Phase 4-6 design system mockup-driven."
        action="Changelog"
      />
      <SectionCard
        title="Licenza"
        body="Open-source GPLv3 (frontend + solver engine). Componenti UI premium: licenza commerciale FEA Pro S.r.l."
        action="Vedi licenze"
      />
      <SectionCard
        title="Roadmap pubblica"
        body="v3.0 in arrivo: backend wiring completo + Stripe billing + collaboration live. Vedi GitHub project board."
        action="Apri roadmap"
      />
      <SectionCard
        title="Attribuzioni"
        body="React 18 · Three.js · NumPy/SciPy · ARPACK · Tailwind · Radix UI · Lucide Icons · Plus Jakarta Sans · Inter · JetBrains Mono. Grazie a tutti gli autori OSS."
        action="Vedi tutte"
      />
    </>
  );
}


// ── Helper components ───────────────────────────────────────────────────

function SectionCard({ title, body, action }: { title: string; body: string; action: string }): JSX.Element {
  return (
    <section className="content-section">
      <div className="content-card">
        <div className="card-row">
          <div className="card-row-l">
            <div className="user-info">
              <h3>{title}</h3>
              <p>{body}</p>
            </div>
          </div>
          <div className="card-row-r">
            <button type="button" className="btn-secondary">{action}</button>
          </div>
        </div>
      </div>
    </section>
  );
}


function SectionPending({ title, tag }: { title: string; tag: string }): JSX.Element {
  return (
    <section className="content-section">
      <header className="section-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>{title}</h2>
        <span style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10, fontWeight: 700, letterSpacing: "var(--ls-wide-2)",
          padding: "3px 8px",
          background: "var(--bg-warn)",
          border: "1px solid rgba(180,83,9,0.30)",
          color: "var(--warn)",
          borderRadius: 5,
        }}>{tag}</span>
      </header>
    </section>
  );
}
