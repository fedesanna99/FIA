/**
 * AuthDialog (alpha.14) — combo Login / Register in un solo dialog.
 *
 * Stato locale: tab "login" | "register", email, password, loading, error.
 * Su success: authStore.setAuth(token, user) + onClose + toast verde.
 * Su fail: mostra messaggio inline (no toast HTTP — già gestito globale).
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
      title={mode === "login" ? "🔐 Accedi" : "✨ Crea account"}
      width={400}
      footer={
        <>
          <button
            type="button"
            className="btn-secondary text-xs"
            onClick={handleClose}
          >Annulla</button>
          <button
            type="submit"
            form="auth-form"
            className="btn-primary text-xs"
            disabled={loading}
            data-testid="auth-submit"
          >
            {loading ? "..." : mode === "login" ? "Accedi" : "Crea account"}
          </button>
        </>
      }
    >
      <form id="auth-form" onSubmit={handleSubmit} className="space-y-3">
        {/* Tab switcher */}
        <div className="flex gap-1 p-0.5 bg-bg-2 rounded text-xs" role="tablist">
          <button
            type="button"
            className={`flex-1 px-2 py-1 rounded transition-colors ${
              mode === "login" ? "bg-accent text-white" : "text-ink-dim hover:text-ink"
            }`}
            onClick={() => { setMode("login"); setError(null); }}
            role="tab"
            aria-selected={mode === "login"}
            data-testid="auth-tab-login"
          >Login</button>
          <button
            type="button"
            className={`flex-1 px-2 py-1 rounded transition-colors ${
              mode === "register" ? "bg-accent text-white" : "text-ink-dim hover:text-ink"
            }`}
            onClick={() => { setMode("register"); setError(null); }}
            role="tab"
            aria-selected={mode === "register"}
            data-testid="auth-tab-register"
          >Registrati</button>
        </div>

        <label className="block">
          <span className="text-xs text-ink-dim block mb-1">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete={mode === "login" ? "email" : "email"}
            required
            className="input w-full text-xs"
            placeholder="utente@esempio.com"
            data-testid="auth-email"
          />
        </label>

        <label className="block">
          <span className="text-xs text-ink-dim block mb-1">
            Password
            {mode === "register" && (
              <span className="text-ink-muted"> (min 8 caratteri)</span>
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
            className="input w-full text-xs"
            data-testid="auth-password"
          />
        </label>

        {error && (
          <div
            className="text-xs text-error bg-error/10 border border-error/30 rounded p-2"
            data-testid="auth-error"
          >
            {error}
          </div>
        )}

        <div className="text-xs text-ink-muted leading-relaxed">
          {mode === "login" ? (
            <>Nessun account? <button
              type="button"
              className="text-accent hover:underline"
              onClick={() => { setMode("register"); setError(null); }}
            >Crea account</button>.</>
          ) : (
            <>Hai gia' un account? <button
              type="button"
              className="text-accent hover:underline"
              onClick={() => { setMode("login"); setError(null); }}
            >Accedi</button>.</>
          )}
        </div>
      </form>
    </Dialog>
  );
}
