// redesign/workspace-fasi · FETTA 2b · FAMIGLIA D · scheda Verifiche
//
// Sostituisce nella scheda "Verifiche" del workspace Risultati l'embed
// di VerifyPanel (che mostrava "Verify > geometria" incoerente con il
// contesto Risultati). Layout aderente al prototipo:
//
//   - banner ambra "Calcolo sospetto" (riuso FAM A)
//   - testata "EC3 · UR" passa/non passa con UR vero
//   - "Come è calcolato": formula in chiaro σ_max / f_yd
//   - tabella "Altre verifiche" (Taglio / Freccia SLE / Stabilità LTB)
//     con etichette validato/stima/"in arrivo" — niente bugia
//   - per geometrie senza sezione normata (cubi solidi ecc.): messaggio
//     "EC3 non applicabile" + rimando alla tab Dati per i valori grezzi
//
// IMPORTANT — niente nuova logica di dominio. UR = σ_max / 235 MPa
// (EC3 S235, γM0=1.00) e' la verifica SEMPLIFICATA su σ vs f_yd. La
// resistenza flessionale completa M_Ed / W_pl / M_Rd richiederebbe la
// sezione (W_pl per profilo) che NON e' attualmente cablata nei tipi
// del modello: dichiariamo esplicitamente cosa stiamo calcolando e
// cosa no. Niente M_Ed / W_pl inventati.

import { useMemo } from "react";
import { AlertTriangle, CheckCircle2, XCircle, Info, MinusCircle } from "lucide-react";
import { useModelStore } from "../../store/modelStore";
import { useResultsStore } from "../../store/resultsStore";
import {
  isEC3Applicable,
  isSuspicious,
  computeUREC3,
  SUSPICIOUS_REASON,
  EC3_NA_REASON,
} from "./resultsHonest";
import { GPS_FYD } from "../../lib/gpsTrust";

type RowTone = "validated" | "estimate" | "empty";

interface OtherCheckRow {
  label: string;
  hint: string;
  ur: string;
  tone: RowTone;
  badge: string;
  badgeTooltip: string;
  testid: string;
}

export function ResultsVerifiche() {
  const model = useModelStore((s) => s.model);
  const staticResults = useResultsStore((s) => s.staticResults);
  const hasResults = !!staticResults;
  const suspicious = isSuspicious(staticResults);
  const ec3Applicable = isEC3Applicable(model);

  const sigmaMaxMPa = staticResults
    ? staticResults.max_stress / 1e6
    : null;
  const urEC3 = useMemo(() => {
    if (!hasResults || !ec3Applicable || suspicious) return null;
    return computeUREC3(staticResults!.max_stress);
  }, [hasResults, ec3Applicable, suspicious, staticResults]);

  // ── Header testata ─────────────────────────────────────────────────────
  const header = (() => {
    if (suspicious) {
      return {
        text: "⚠ Calcolo sospetto",
        ur: "—",
        tone: "warn" as const,
        sub: "i numeri non hanno senso fisico (vedi banner)",
      };
    }
    if (!hasResults) {
      return {
        text: "Nessun calcolo",
        ur: "—",
        tone: "empty" as const,
        sub: "Lancia un'analisi statica per vedere le verifiche.",
      };
    }
    if (!ec3Applicable) {
      return {
        text: "EC3 · non applicabile",
        ur: "n/a",
        tone: "na" as const,
        sub: "Questa geometria non ha sezione normata acciaio.",
      };
    }
    return {
      text: urEC3! <= 1 ? "EC3 · resistenza σ — Passa ✓" : "EC3 · resistenza σ — Non passa ✗",
      ur: urEC3!.toFixed(2),
      tone: urEC3! <= 1 ? "pass" as const : "fail" as const,
      sub: urEC3! <= 1 ? "σ_max sotto la resistenza di calcolo." : "σ_max supera la resistenza di calcolo.",
    };
  })();

  // ── Altre verifiche (Taglio / Freccia SLE / LTB) ──────────────────────
  // Tutti "—" finche' non c'e' il cablamento dedicato — niente UR finti.
  // LTB sempre "stima" come da prototipo (formulazione semplificata
  // anche quando arrivera').
  const otherChecks: OtherCheckRow[] = ec3Applicable && hasResults && !suspicious
    ? [
        {
          label: "Taglio",
          hint: "EC3 §6.2.6",
          ur: "—",
          tone: "empty",
          badge: "in arrivo",
          badgeTooltip: "Verifica a taglio (V_Ed / V_Rd) non cablata in questa fase. Consulta la tab Dati per V grezzo.",
          testid: "verifiche-row-taglio",
        },
        {
          label: "Freccia",
          hint: "SLE L/250",
          ur: "—",
          tone: "empty",
          badge: "in arrivo",
          badgeTooltip: "Verifica freccia (δ vs L/250) richiede la lunghezza degli elementi: non cablata. Consulta la tab Dati per δ grezzo.",
          testid: "verifiche-row-freccia",
        },
        {
          label: "Stabilità LTB",
          hint: "EC3 §6.3.2",
          ur: "—",
          tone: "estimate",
          badge: "stima",
          badgeTooltip: "Verifica instabilità flesso-torsionale (LTB) è semplificata anche nella roadmap. Da confermare a mano per elementi snelli.",
          testid: "verifiche-row-ltb",
        },
      ]
    : [];

  return (
    <div className="results-verifiche" data-testid="results-verifiche">
      {suspicious && (
        <div className="results-data-warn" data-testid="verifiche-warn" role="alert">
          <AlertTriangle size={14} aria-hidden />
          <span>
            <strong>Calcolo sospetto:</strong> i numeri qui sotto potrebbero non
            avere senso fisico. {SUSPICIOUS_REASON}
          </span>
        </div>
      )}

      <div
        className={`results-verifiche-head results-verifiche-head--${header.tone}`}
        data-testid="verifiche-header"
        data-tone={header.tone}
        title={!ec3Applicable && hasResults ? EC3_NA_REASON : undefined}
      >
        <HeaderIcon tone={header.tone} />
        <div className="results-verifiche-head-text">
          <div className="results-verifiche-head-title">{header.text}</div>
          <div className="results-verifiche-head-sub">{header.sub}</div>
        </div>
        <div className="results-verifiche-head-ur" data-testid="verifiche-header-ur">
          UR {header.ur}
        </div>
      </div>

      {/* "Come è calcolato" — formula in chiaro solo se la verifica è
          realmente in essere (non n/a, non sospetto, non empty) */}
      {hasResults && ec3Applicable && !suspicious && (
        <div className="results-verifiche-formula" data-testid="verifiche-formula">
          <span className="results-data-tbar-sp" />
          <div className="results-verifiche-formula-rows">
            <FormulaRow k="σ_max (sollecitazione)" v={`${(sigmaMaxMPa ?? 0).toLocaleString("it-IT", { maximumFractionDigits: 0 })} MPa`} />
            <FormulaRow k="f_yd (S235, EC3 §3.2.6)" v={`${GPS_FYD.ec3} MPa`} />
            <FormulaRow k="γM0 (S235 acciaio)" v="1.00" />
            <FormulaRow
              k="UR = σ_max / f_yd"
              v={`${urEC3!.toFixed(2)} ${urEC3! <= 1 ? "✓" : "✗"}`}
              highlight
              tone={urEC3! <= 1 ? "pass" : "fail"}
            />
          </div>
          <p className="results-verifiche-formula-note">
            Verifica <b>semplificata</b> a σ vs f_yd. La verifica flessionale
            completa (M_Ed / W_pl / M_Rd) richiede la sezione normata del
            profilo, ancora non cablata. I valori grezzi M / V / N sono
            nella <b>tab Dati &gt; Sollecitazioni</b>.
          </p>
        </div>
      )}

      {/* Altre verifiche */}
      {otherChecks.length > 0 && (
        <div className="results-verifiche-others" data-testid="verifiche-others">
          <span className="results-data-tbar-sp" />
          {otherChecks.map((r) => (
            <div
              key={r.testid}
              className={`results-verifiche-row results-verifiche-row--${r.tone}`}
              data-testid={r.testid}
              data-tone={r.tone}
            >
              <span className="results-verifiche-row-label">
                {r.label}
                <small> {r.hint}</small>
              </span>
              <span className="results-verifiche-row-ur">UR {r.ur}</span>
              <span
                className={`results-verifiche-badge results-verifiche-badge--${r.tone}`}
                title={r.badgeTooltip}
                data-testid={`${r.testid}-badge`}
              >
                {r.badge}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* n/a fallback: messaggio chiaro + rimando a Dati */}
      {!ec3Applicable && hasResults && !suspicious && (
        <div className="results-verifiche-na" data-testid="verifiche-na">
          <Info size={14} aria-hidden />
          <p>
            <strong>EC3 non applicabile a questa geometria.</strong>{" "}
            La verifica EC3 si applica a travi/aste con sezione normata
            (S235/S275/S355). Per questa geometria consulta i valori
            grezzi nella <b>tab Dati</b>.
          </p>
        </div>
      )}
    </div>
  );
}

function HeaderIcon({ tone }: { tone: "pass" | "fail" | "warn" | "na" | "empty" }) {
  if (tone === "pass") return <CheckCircle2 size={20} aria-hidden />;
  if (tone === "fail") return <XCircle size={20} aria-hidden />;
  if (tone === "warn") return <AlertTriangle size={20} aria-hidden />;
  if (tone === "na") return <Info size={20} aria-hidden />;
  return <MinusCircle size={20} aria-hidden />;
}

function FormulaRow({
  k, v, highlight, tone,
}: { k: string; v: string; highlight?: boolean; tone?: "pass" | "fail" }) {
  return (
    <div
      className={`results-verifiche-formula-row${highlight ? " is-result" : ""}${
        tone ? ` results-verifiche-formula-row--${tone}` : ""
      }`}
    >
      <span>{k}</span>
      <b>{v}</b>
    </div>
  );
}
