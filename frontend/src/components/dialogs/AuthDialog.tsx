/**
 * AuthDialog (Precision v2.0 PR16 T12) — Login + Register stile Precision.
 *
 * Riscritto pixel-faithful con linguaggio Precision (sharp radius, hairline
 * borders, mono labels uppercase, niente emoji nel title).
 *
 * Stato locale: tab "login" | "register", email, password, loading, error.
 * Su success: authStore.setAuth(token, user) + onClose + toast verde.
 * Su fail: messaggio inline (no toast HTTP — già gestito globale).
 */
import { useState, type FormEvent } from "react";

import { login as apiLogin, register as apiRegister } from "../../api/auth";
import { useAuthStore } from "../../store/authStore";
import { toast } from "../../store/toastStore";
import { Dialog } from "./Dialog";


interface Props {
  open: boolean;
  onClose: () => void;
  /** Modalita' iniziale ("login" o "register"). Default "login". */
  initialMode?: "login" | "register";
}


export function AuthDialog({ open, onClose, initialMode = "login" }: Props) {
  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setAuth = useAuthStore((s) => s.setAuth);

  function reset() {
    setEmail("");
    setPassword("");
    setError(null);
    setLoading(false);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
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
      const res = await fn(email.trim(), password);
      setAuth(res.token, res.user);
      toast("success", mode === "login"
        ? `Benvenuto ${res.user.email}!`
        : `Account creato per ${res.user.email}!`);
      reset();
      onClose();
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })
        ?.response?.data?.detail
        ?? (err as Error)?.message
        ?? "Errore sconosciuto";
      setError(detail);
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    reset();
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={mode === "login" ? "Accedi" : "Crea account"}
      width={420}
      footer={
        <>
          <button
            type="button"
            onClick={handleClose}
            className="px-3 py-1.5 text-sm font-medium text-ink-2 hover:text-ink hover:bg-bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
          >
            Annulla
          </button>
          <button
            type="submit"
            form="auth-form"
            disabled={loading}
            data-testid="auth-submit"
            className="inline-flex items-center gap-1.5 bg-accent text-white border border-accent px-4 py-1.5 text-sm font-medium hover:bg-accent-hover disabled:opacity-50 disabled:cursor-wait focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
          >
            {loading && (
              <span className="inline-block w-3 h-3 border-[1.5px] border-white/40 border-t-white animate-spin" />
            )}
            {loading ? "..." : mode === "login" ? "Accedi" : "Crea account"}
          </button>
        </>
      }
    >
      <form id="auth-form" onSubmit={handleSubmit} className="space-y-4">
        {/* Tab switcher — Precision: uppercase mono, hairline border, no rounded */}
        <div
          className="flex gap-0 border border-border bg-bg-panel p-0.5"
          role="tablist"
          data-testid="auth-tabs"
        >
          <button
            type="button"
            className={[
              "flex-1 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wide-2 font-semibold transition-colors",
              mode === "login"
                ? "bg-accent text-white"
                : "text-ink-3 hover:text-ink hover:bg-bg-hover",
            ].join(" ")}
            onClick={() => { setMode("login"); setError(null); }}
            role="tab"
            aria-selected={mode === "login"}
            data-testid="auth-tab-login"
          >
            Login
          </button>
          <button
            type="button"
            className={[
              "flex-1 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wide-2 font-semibold transition-colors",
              mode === "register"
                ? "bg-accent text-white"
                : "text-ink-3 hover:text-ink hover:bg-bg-hover",
            ].join(" ")}
            onClick={() => { setMode("register"); setError(null); }}
            role="tab"
            aria-selected={mode === "register"}
            data-testid="auth-tab-register"
          >
            Registrati
          </button>
        </div>

        {/* Email field — Precision: field-label mono uppercase, hairline input */}
        <label className="block">
          <span className="block font-mono text-[10px] uppercase tracking-wide-1 text-ink-3 mb-1.5">
            Email
          </span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            placeholder="utente@esempio.com"
            data-testid="auth-email"
            className="w-full px-2.5 py-1.5 text-sm bg-bg-elevated border border-border-light text-ink placeholder:text-ink-3 focus:border-accent focus:outline-none transition-colors"
          />
        </label>

        {/* Password field */}
        <label className="block">
          <span className="block font-mono text-[10px] uppercase tracking-wide-1 text-ink-3 mb-1.5">
            Password
            {mode === "register" && (
              <span className="text-ink-4 normal-case tracking-normal"> · min 8 caratteri</span>
            )}
          </span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            required
            minLength={mode === "register" ? 8 : 1}
            maxLength={72}
            data-testid="auth-password"
            className="w-full px-2.5 py-1.5 text-sm bg-bg-elevated border border-border-light text-ink placeholder:text-ink-3 focus:border-accent focus:outline-none transition-colors"
          />
        </label>

        {/* Error banner — Precision: hairline border tonale, no rounded */}
        {error && (
          <div
            className="flex items-start gap-2 px-3 py-2 bg-bg-danger border border-danger/40 text-sm text-danger"
            data-testid="auth-error"
            role="alert"
          >
            <span className="font-mono text-[11px] uppercase tracking-wide-1 text-danger font-semibold flex-shrink-0">!</span>
            <span>{error}</span>
          </div>
        )}

        {/* Footnote — switch mode */}
        <div className="text-xs text-ink-2 leading-relaxed pt-1 border-t border-border">
          {mode === "login" ? (
            <>Nessun account?{" "}
              <button
                type="button"
                onClick={() => { setMode("register"); setError(null); }}
                className="text-accent hover:underline font-medium"
              >
                Crea account
              </button>
              .
            </>
          ) : (
            <>Hai già un account?{" "}
              <button
                type="button"
                onClick={() => { setMode("login"); setError(null); }}
                className="text-accent hover:underline font-medium"
              >
                Accedi
              </button>
              .
            </>
          )}
        </div>
      </form>
    </Dialog>
  );
}
