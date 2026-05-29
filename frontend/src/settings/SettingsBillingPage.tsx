/**
 * SettingsBillingPage · Fetta E3.8 (redesign workspace-fasi)
 *
 * Pagina /settings/billing che il banner sticky quota della Dashboard
 * linka tramite "Vedi fatturazione". Replica mockup Claude Design
 * Round 2 (Handoff 05 §R2.2) `Settings-Billing.html`.
 *
 * 3 stati derivati deterministicamente da quotaStore:
 *   A · Free standard (quota OK)
 *   B · Free >80% (banner sticky condizionale)
 *   C · Pro attivo (illimitato)
 *
 * Prezzo Pro: placeholder €XX/mese (decisione carta bianca Federico
 * 29/05: cablare 19 €/mese come riferimento iniziale quando si decide
 * il numero finale). Disclaimer onesto sui prezzi in definizione.
 */
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Minus, Info } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getQuota } from "../api/billing";
import { useAuthStore } from "../store/authStore";
import { useModelList } from "../hooks/useModel";
import { DashTopBar } from "../dashboard/DashTopBar";
import { QuotaBanner } from "../dashboard/QuotaBanner";
import "../styles/dashboard-soft.css";
import "../styles/settings-billing.css";

type BillingState = "A" | "B" | "C";

const PRO_PRICE_EUR = 19; // E3.8 placeholder, vedi commit message
const QUOTA_THRESHOLD = 0.8;

export function SettingsBillingPage() {
  const userId = useAuthStore((s) => s.user?.id ?? "");
  const { data: quota } = useQuery({
    queryKey: ["quota", userId],
    queryFn: () => getQuota(userId),
    enabled: !!userId,
    staleTime: 30_000,
  });
  const modelsQuery = useModelList();
  const userModelsCount = modelsQuery.data?.length ?? 0;

  const tier = quota?.tier ?? "free";
  // Pattern identico a DashboardPage.tsx riga 140-141: cap derivato dal
  // tier, used = min(userModels, cap).
  const projCap = tier === "free" ? 5 : tier === "pro" ? 0 : 50;
  const projUsed = projCap > 0 ? Math.min(userModelsCount, projCap) : userModelsCount;

  const state: BillingState = useMemo(() => {
    if (tier === "pro" || tier === "enterprise") return "C";
    if (projCap > 0 && projUsed / projCap > QUOTA_THRESHOLD) return "B";
    return "A";
  }, [tier, projUsed, projCap]);

  const tierLabel = tier.toUpperCase();
  const usageFillPct = state === "C" ? 100 : projCap > 0 ? Math.min(100, (projUsed / projCap) * 100) : 0;
  const usageBarColor =
    state === "C" ? "var(--success)" : state === "B" ? "var(--warn)" : "var(--accent)";

  return (
    <div className="dash dash-soft" data-testid="settings-billing-page" data-state={state}>
      <DashTopBar tierLabel={tierLabel} />
      <QuotaBanner used={projUsed} limit={projCap} />
      <main className="sb-main">
        <div className="sb-wrap">
          <Link to="/" className="sb-back">
            <ArrowLeft strokeWidth={2.2} aria-hidden />
            Impostazioni · Fatturazione
          </Link>

          {/* Hero */}
          <section className="sb-hero">
            <span className="eyebrow">Piano</span>
            <h1>
              {state === "C" ? "Piano Pro" : "Piano Free"}
              <span className={`sb-tier ${state === "C" ? "tier-pro" : "tier-free"}`}>
                {state === "C" ? "attivo" : `€0 / mese`}
              </span>
            </h1>
            <p className="sb-sub">
              {state === "A" && (
                "Paghi solo quello che usi. Il piano Free copre il 90% dei flussi di sviluppo e prototipazione."
              )}
              {state === "B" && (
                <>
                  <b>Stai per raggiungere il limite</b> del piano Free. Libera spazio archiviando un modello, o passa a Pro.
                </>
              )}
              {state === "C" && (
                <>Modelli illimitati e tutti i solver attivi. Grazie per il supporto al progetto. 🤍</>
              )}
            </p>
          </section>

          {/* Card · Utilizzo corrente */}
          <section className="sb-card">
            <div className="sb-card-head">
              <span className="eyebrow">Utilizzo corrente</span>
              <h2>Modelli salvati</h2>
            </div>

            <div className="usage-top">
              <div className="usage-figure">
                {state === "C" ? (
                  <>
                    <span className="uf-used is-pro">∞</span>
                    <span className="uf-label">progetti illimitati · piano Pro</span>
                  </>
                ) : (
                  <>
                    <span className="uf-used">{projUsed}</span>
                    <span className="uf-sep">/</span>
                    <span className="uf-limit">{projCap}</span>
                    <span className="uf-label">progetti attivi</span>
                  </>
                )}
              </div>

              <div className="usage-cta-top">
                {state === "C" ? (
                  <a className="manage-link" href="#">
                    Gestisci abbonamento
                    <ArrowRight strokeWidth={2} aria-hidden />
                  </a>
                ) : (
                  <a className="plan-cta is-primary" href="#plans">
                    Scopri Pro
                  </a>
                )}
              </div>
            </div>

            <div className="usage-bar">
              <div className="usage-fill" style={{ width: `${usageFillPct}%`, background: usageBarColor }} />
            </div>
            <p className="usage-hint">
              {state === "A" && `${projCap - projUsed} progetti ancora disponibili sul piano Free.`}
              {state === "B" && "1 solo progetto rimasto. Archivia un modello o passa a Pro per continuare."}
              {state === "C" && "Nessun limite di progetti sul piano Pro."}
            </p>

            {/* Lista placeholder — TODO E3.8+: lista reale dei modelli dell'utente dal backend */}
            <div className="usage-list" data-testid="sb-usage-list">
              <UsageRow name="Trave bi-appoggiata 2D" id="UC1" date="creato 24/05" size="12 KB" />
              <UsageRow name="Cubo H8 test" date="creato 26/05" size="45 KB" />
              {(state === "B" || state === "C") && (
                <>
                  <UsageRow name="Portale 2D · vento" id="UC2" date="creato 27/05" size="18 KB" />
                  <UsageRow name="Torre 8 piani · sismica" id="UC3" date="creato 28/05" size="64 KB" />
                </>
              )}
            </div>
          </section>

          {/* Card · Confronto piani */}
          <section className="sb-card" id="plans">
            <div className="sb-card-head">
              <span className="eyebrow">Confronto piani</span>
              <h2>Free e Pro a confronto</h2>
            </div>

            <div className="plans-grid">
              {/* Free */}
              <div className="plan plan-free">
                <div className="plan-top">
                  <span className="plan-name">Free</span>
                  {state !== "C" && <span className="plan-current-chip">Piano attivo</span>}
                </div>
                <div className="plan-price">
                  <span className="pp-amount">€0</span>
                  <span className="pp-period">/ mese</span>
                </div>
                <ul className="feature-list">
                  <FeatureItem yes>5 progetti</FeatureItem>
                  <FeatureItem yes>Calcolo statico + modale</FeatureItem>
                  <FeatureItem yes>Verifica EC3 base</FeatureItem>
                  <FeatureItem yes={false}>AI suggest (palette ⌘K)</FeatureItem>
                  <FeatureItem yes={false}>NAFEMS reference suite</FeatureItem>
                  <FeatureItem yes={false}>Audit log</FeatureItem>
                  <FeatureItem yes={false}>Support prioritario</FeatureItem>
                </ul>
                {state === "C" ? (
                  <span className="plan-cta is-ghost">Piano base</span>
                ) : (
                  <span className="plan-cta is-current-cta">Piano attivo</span>
                )}
              </div>

              {/* Pro */}
              <div className="plan plan-pro">
                <div className="plan-top">
                  <span className="plan-name">Pro</span>
                  {state === "C" && <span className="plan-current-chip">Piano attivo</span>}
                </div>
                <div className="plan-price">
                  <span className="pp-amount">€{PRO_PRICE_EUR}</span>
                  <span className="pp-period">/ mese · pay-per-token</span>
                </div>
                <ul className="feature-list">
                  <FeatureItem yes>Progetti illimitati</FeatureItem>
                  <FeatureItem yes>Tutti i 10 solver + verifiche EC complete</FeatureItem>
                  <FeatureItem yes>AI suggest (palette ⌘K)</FeatureItem>
                  <FeatureItem yes>NAFEMS reference suite</FeatureItem>
                  <FeatureItem yes>Audit log</FeatureItem>
                  <FeatureItem yes>Support prioritario</FeatureItem>
                </ul>
                {state === "C" ? (
                  <span className="plan-cta is-current-cta">Già attivo</span>
                ) : (
                  <a className="plan-cta is-primary" href="#">
                    Passa a Pro
                    <ArrowRight strokeWidth={2} aria-hidden />
                  </a>
                )}
              </div>
            </div>
          </section>

          {/* Disclaimer onesto */}
          <div className="sb-disclaimer">
            <Info strokeWidth={2} aria-hidden />
            <p>
              Prezzi e feature sono{" "}
              <b style={{ color: "var(--ink-muted)", fontWeight: 600 }}>in definizione</b> — il
              pricing finale è ancora da confermare col team. Per ora il piano Free copre il 90% dei
              flussi di sviluppo e prototipazione.{" "}
              <Link to="/preliminary">Perché &quot;Preliminary&quot;?</Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

function UsageRow({ name, id, date, size }: { name: string; id?: string; date: string; size: string }) {
  return (
    <div className="usage-row">
      <span className="ur-dot" />
      <span className="ur-name">
        {name} {id && <span className="ur-id">{id}</span>}
      </span>
      <span className="ur-meta">{date}</span>
      <span className="ur-size">{size}</span>
    </div>
  );
}

function FeatureItem({ yes, children }: { yes: boolean; children: React.ReactNode }) {
  return (
    <li className={yes ? undefined : "is-off"}>
      <span className={`fi ${yes ? "fi-yes" : "fi-no"}`}>
        {yes ? <Check strokeWidth={2.4} aria-hidden /> : <Minus strokeWidth={2.2} aria-hidden />}
      </span>
      {children}
    </li>
  );
}
