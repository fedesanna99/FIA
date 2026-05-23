/**
 * AuthScreen (v2.1.4 auth-gate) — full-page login/signup obbligatorio.
 *
 * Sostituisce AuthDialog come ingresso. Quando l'utente non è loggato,
 * l'App monta questo schermo invece del workspace: non c'è modo di
 * arrivare alla webapp senza un account valido.
 *
 * Layout (responsive):
 *   • desktop ≥ md: due colonne (brand hero a sinistra, form a destra)
 *   • mobile  < md: una sola colonna (brand compatto sopra, form sotto)
 *
 * Stile Precision: sharp corners, hairline borders, font-display Inter Tight,
 * mono labels uppercase, cyan accent #0891B2.
 */
import { useState, type FormEvent } from "react";
import { Activity, ArrowRight, LogIn, ShieldCheck, Sparkles, UserPlus } from "lucide-react";

import { login as apiLogin, register as apiRegister } from "../../api/auth";
import { APP_VERSION } from "../../lib/version";
import { useAuthStore } from "../../store/authStore";
import { toast } from "../../store/toastStore";


type Mode = "login" | "register";


export function AuthScreen() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setAuth = useAuthStore((s) => s.setAuth);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError("Email e password sono obbligatorie.");
      return;
    }
    if (mode === "register" && password.length < 8) {
      setError("La password deve avere almeno 8 caratteri.");
      return;
    }

    setLoading(true);
    try {
      const fn = mode === "login" ? apiLogin : apiRegister;
      const res = await fn(trimmedEmail, password);
      setAuth(res.token, res.user);
      toast(
        "success",
        mode === "login"
          ? `Benvenuto ${res.user.email}!`
          : `Account creato per ${res.user.email}!`,
      );
      // Reset locale (per sicurezza — comunque il componente sparirà subito
      // perché il gate App passa a mostrare la webapp).
      setEmail("");
      setPassword("");
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        (err as Error)?.message ??
        "Errore sconosciuto";
      setError(humanizeAuthError(String(detail), mode));
    } finally {
      setLoading(false);
    }
  }

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col md:flex-row bg-bg overflow-y-auto animate-fade-in"
      data-testid="auth-screen"
    >
      {/* ── Brand hero (left on desktop, top on mobile) ───────────────────── */}
      <aside className="relative flex flex-col md:flex-1 md:max-w-[480px] bg-bg-panel border-b md:border-b-0 md:border-r border-border px-6 md:px-10 py-8 md:py-12 overflow-hidden">
        {/* Logo bar */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-8 h-8 bg-accent/10 border border-accent/40 flex items-center justify-center">
            <span className="text-accent text-base font-bold font-display">F</span>
          </div>
          <div className="flex flex-col">
            <span className="font-display font-semibold text-base text-ink tracking-tight-1 leading-none">
              FEA Pro
            </span>
            <span className="font-mono text-[10px] uppercase tracking-wide-1 text-ink-3 leading-none mt-0.5">
              {APP_VERSION}
            </span>
          </div>
        </div>

        {/* Headline */}
        <div className="mt-10 md:mt-16 flex-1 flex flex-col justify-center max-w-md">
          <h1 className="font-display font-bold text-[28px] md:text-[40px] leading-[1.05] tracking-tight-1 text-ink">
            FEA professionale,{" "}
            <span className="text-accent">senza compromessi.</span>
          </h1>
          <p className="mt-4 text-sm md:text-base text-ink-2 leading-relaxed">
            Studio Pro per modellazione 3D parametrica, Percorsi guidati con
            verifiche EC3/NTC, report PDF tracciabili. Niente account demo,
            niente sandbox: l'analisi che fai è la tua.
          </p>

          {/* Feature pillole */}
          <ul className="mt-8 space-y-3 hidden md:block">
            <FeatureRow
              icon={Activity}
              title="Solver real-time"
              desc="Statica, modale, dinamica e buckling con progress WS live."
            />
            <FeatureRow
              icon={ShieldCheck}
              title="Trust Layer"
              desc="Ogni report mostra qualifica, riferimenti normativi e firma deterministica."
            />
            <FeatureRow
              icon={Sparkles}
              title="GPS Strutturale"
              desc="Verifiche didattiche S275/EC3/NTC istantanee sul risultato corrente."
            />
          </ul>
        </div>

        {/* Footer brand */}
        <div className="mt-8 md:mt-0 pt-4 border-t border-border text-[11px] text-ink-3 flex-shrink-0">
          © {new Date().getFullYear()} FEA Pro · Italia · costruzione e analisi
        </div>
      </aside>

      {/* ── Form pane (right on desktop, bottom on mobile) ────────────────── */}
      <main className="flex-1 flex items-start md:items-center justify-center px-5 md:px-10 py-10 md:py-12 min-h-0">
        <div className="w-full max-w-[420px] animate-slide-up">
          {/* Mode tabs */}
          <div
            className="flex gap-0 border border-border bg-bg-panel p-0.5"
            role="tablist"
            aria-label="Modalità autenticazione"
            data-testid="auth-tabs"
          >
            <TabButton
              active={mode === "login"}
              onClick={() => switchMode("login")}
              testId="auth-tab-login"
            >
              <LogIn className="w-3 h-3" />
              Accedi
            </TabButton>
            <TabButton
              active={mode === "register"}
              onClick={() => switchMode("register")}
              testId="auth-tab-register"
            >
              <UserPlus className="w-3 h-3" />
              Crea account
            </TabButton>
          </div>

          {/* Titolo + sottotitolo */}
          <div className="mt-6">
            <h2 className="font-display font-semibold text-[22px] tracking-tight-1 text-ink leading-tight">
              {mode === "login" ? "Bentornato" : "Crea il tuo account"}
            </h2>
            <p className="mt-1 text-sm text-ink-2 leading-relaxed">
              {mode === "login"
                ? "Inserisci le tue credenziali per accedere ai tuoi modelli."
                : "Bastano email e password per iniziare. Niente carta di credito."}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-5 space-y-4" noValidate>
            <Field
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
              autoComplete="email"
              placeholder="utente@esempio.com"
              testId="auth-email"
              required
            />

            <Field
              label="Password"
              hint={mode === "register" ? "min 8 caratteri" : undefined}
              type="password"
              value={password}
              onChange={setPassword}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              placeholder="••••••••"
              testId="auth-password"
              required
              minLength={mode === "register" ? 8 : 1}
              maxLength={72}
            />

            {error && (
              <div
                className="flex items-start gap-2 px-3 py-2 bg-bg-danger border border-danger/40 text-sm text-danger animate-slide-down"
                role="alert"
                data-testid="auth-error"
              >
                <span className="font-mono text-[11px] uppercase tracking-wide-1 font-semibold flex-shrink-0">
                  !
                </span>
                <span className="leading-snug">{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              data-testid="auth-submit"
              className="w-full inline-flex items-center justify-center gap-2 bg-accent text-white border border-accent px-4 py-2.5 text-sm font-semibold hover:bg-accent-hover disabled:opacity-50 disabled:cursor-wait focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg transition-colors"
            >
              {loading ? (
                <>
                  <span className="inline-block w-3.5 h-3.5 border-[1.5px] border-white/40 border-t-white animate-spin" />
                  <span>Attendere…</span>
                </>
              ) : (
                <>
                  <span>{mode === "login" ? "Accedi" : "Crea account"}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Switcher footer */}
          <div className="mt-5 pt-4 border-t border-border text-sm text-ink-2 leading-relaxed">
            {mode === "login" ? (
              <>
                Non hai ancora un account?{" "}
                <button
                  type="button"
                  onClick={() => switchMode("register")}
                  className="text-accent hover:underline font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-sm"
                  data-testid="auth-switch-to-register"
                >
                  Creane uno gratis →
                </button>
              </>
            ) : (
              <>
                Hai già un account?{" "}
                <button
                  type="button"
                  onClick={() => switchMode("login")}
                  className="text-accent hover:underline font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-sm"
                  data-testid="auth-switch-to-login"
                >
                  Accedi →
                </button>
              </>
            )}
          </div>

          {/* Disclaimer privacy compatto */}
          <p className="mt-6 text-[11px] text-ink-3 leading-relaxed">
            {mode === "register" ? (
              <>
                Creando un account accetti che i tuoi modelli vengano salvati in
                modo persistente. Niente tracciamento di terze parti.
              </>
            ) : (
              <>
                La connessione è cifrata. Il token resta sul tuo dispositivo
                (localStorage) e scade automaticamente.
              </>
            )}
          </p>
        </div>
      </main>
    </div>
  );
}


// ── Sotto-componenti privati ───────────────────────────────────────────────

interface FieldProps {
  label: string;
  hint?: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
  placeholder?: string;
  testId: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
}

function Field(props: FieldProps) {
  return (
    <label className="block">
      <span className="block font-mono text-[10px] uppercase tracking-wide-1 text-ink-3 mb-1.5 font-semibold">
        {props.label}
        {props.hint && (
          <span className="text-ink-4 normal-case tracking-normal font-normal ml-1">
            · {props.hint}
          </span>
        )}
      </span>
      <input
        type={props.type}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        autoComplete={props.autoComplete}
        placeholder={props.placeholder}
        required={props.required}
        minLength={props.minLength}
        maxLength={props.maxLength}
        data-testid={props.testId}
        className="w-full px-3 py-2 text-sm bg-bg-elevated border border-border-light text-ink placeholder:text-ink-3 focus:border-accent focus:outline-none transition-colors"
      />
    </label>
  );
}


interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  testId: string;
}

function TabButton({ active, onClick, children, testId }: TabButtonProps) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      data-testid={testId}
      className={[
        "flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 font-mono text-[11px] uppercase tracking-wide-2 font-semibold transition-colors",
        active
          ? "bg-accent text-white"
          : "text-ink-3 hover:text-ink hover:bg-bg-hover",
      ].join(" ")}
    >
      {children}
    </button>
  );
}


function FeatureRow({
  icon: Icon,
  title,
  desc,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
}) {
  return (
    <li className="flex items-start gap-3">
      <div className="w-8 h-8 bg-accent/10 border border-accent/30 flex items-center justify-center flex-shrink-0">
        <Icon className="w-3.5 h-3.5 text-accent" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-display font-semibold text-sm text-ink tracking-tight-1">
          {title}
        </div>
        <div className="text-[12px] text-ink-2 leading-snug mt-0.5">{desc}</div>
      </div>
    </li>
  );
}


/**
 * Traduce gli errori più comuni del backend auth in italiano umano.
 * Backend ritorna stringhe inglesi nei detail HTTP 401/409.
 */
function humanizeAuthError(detail: string, mode: Mode): string {
  const lower = detail.toLowerCase();
  if (lower.includes("invalid email or password")) {
    return "Email o password non validi.";
  }
  if (lower.includes("already exists") || lower.includes("already registered")) {
    return "Esiste già un account con questa email. Prova ad accedere.";
  }
  if (lower.includes("network") || lower.includes("failed to fetch")) {
    return "Impossibile contattare il server. Riprova fra qualche secondo.";
  }
  if (lower.includes("password") && mode === "register") {
    return "Password troppo debole. Usa almeno 8 caratteri.";
  }
  return detail;
}
