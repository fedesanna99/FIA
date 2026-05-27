/**
 * SettingsPage · v2.8.0 Phase 6.2 mockup-driven
 *
 * Replica condensata di Settings.html: Topbar + sidebar nav 3 sezioni
 * (Profilo/Avanzato/Sistema) + content Account tab (Identity card + fields).
 *
 * Route: /settings dentro AuthGate.
 */
import { useState } from "react";
import {
  BadgeCheck, Bell, CreditCard, Key, KeyRound, LogOut, Mail, Settings as SettingsIcon,
  User, UserCircle, Weight,
} from "lucide-react";
import { Link } from "react-router-dom";

import { useAuthStore } from "../store/authStore";

import "../styles/settings.css";


type Section = "account" | "profile" | "billing" | "api" | "prefs" | "units" | "shortcuts" | "about" | "logout";


export function SettingsPage(): JSX.Element {
  const [active, setActive] = useState<Section>("account");
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
