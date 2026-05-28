/**
 * LoginPage · v2.7.0 Phase 4.1 mockup-driven (F.4 completa)
 *
 * State 1 di 4 (LOGIN). Implementazione completa secondo mockup
 * `ui_kits/webapp_desktop/Auth.html` righe 182-244.
 *
 * Composta da:
 *   - AuthCard wrapper (eyebrow + title + sub + form + footer)
 *   - AuthField Email (icon Mail + validation email RFC)
 *   - AuthField Password con `labelAside` "Dimenticata?" (link a
 *     /forgot-password) + `trail` eye toggle show/hide (mockup riga 209)
 *   - Checkbox custom "Resta connesso per 30 giorni" (mockup riga 215-220).
 *     Brief decisione 1: backend NON gestisce remember-me; checkbox è
 *     cosmetico — il payload login resta `{email, password}`.
 *   - Primary CTA "Entra in FEA Pro" con ArrowRight icon (mockup 222-225)
 *   - AuthDivider "oppure"
 *   - SSOButtons Google + GitHub (UI only, onClick → toast)
 *   - Footer "Non hai un account? Creane uno gratuito" → /signup
 *
 * Form validation: react-hook-form 7 + zod 4 (+ @hookform/resolvers 5).
 *
 * Backward compat smoke E2E v2.6.2/v2.6.6: preservati `data-testid`
 * auth-email / auth-password / auth-submit / auth-go-signup. Lo smoke
 * legacy fa fill + submit per arrivare alla home dashboard senza modifiche.
 *
 * Redirect post-login: usa `useNavigate("/")` con `replace: true`. Se la
 * route originale è preservata in `location.state.from` (AuthGate redirect),
 * si torna lì invece. TODO(F.4-followup): se Federico vuole respect del
 * `from` path, leggere `useLocation().state` qui.
 */
import { useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, Check, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { login as apiLogin } from "../api/auth";
import { useAuthStore } from "../store/authStore";
import { translateAxiosError } from "../lib/apiErrors";

import { AuthCard } from "./components/AuthCard";
import { AuthDivider } from "./components/AuthDivider";
import { AuthField } from "./components/AuthField";
import { SSOButtons } from "./components/SSOButtons";


const loginSchema = z.object({
  email: z.string().email("Email non valida"),
  password: z.string().min(1, "Password richiesta"),
  stayLogged: z.boolean().optional(),
});

type LoginForm = z.infer<typeof loginSchema>;


export function LoginPage() {
  const [showPwd, setShowPwd] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const setAuth = useAuthStore((s) => s.setAuth);
  // v3.1.1 audit-fix L1-2: leggi `state.from` per redirect post-login al
  // path originale (deep-link). AuthGate.tsx già passa `state: { from }`
  // quando reindirizza a /login un utente non autenticato. Default "/" .
  const redirectTo = (location.state as { from?: string } | null)?.from ?? "/";

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", stayLogged: false },
    mode: "onSubmit",
  });

  const stayLogged = watch("stayLogged");

  async function onSubmit(data: LoginForm): Promise<void> {
    setSubmitError(null);
    try {
      const res = await apiLogin(data.email.trim(), data.password);
      setAuth(res.token, res.user);
      // v3.1.1 audit-fix L1-2: redirect a `state.from` se presente (deep-link
      // preservato da AuthGate). Default "/" se l'utente è andato direttamente
      // su /login senza un redirect inbound.
      navigate(redirectTo, { replace: true });
    } catch (err: unknown) {
      // v3.1.1 audit-fix L1-4: error narrowing robusto. Strategia 3-step:
      // 1) leggi `detail` stringa (caso FastAPI HTTPException semplice)
      // 2) prova humanizeLoginError (mapping IT per messaggi noti login)
      // 3) fallback translateAxiosError per detail strutturati (array 422 ecc.)
      const errObj = err as { response?: { status?: number; data?: { detail?: unknown } }; message?: string };
      const detail = errObj?.response?.data?.detail;
      const status = errObj?.response?.status;
      if (typeof detail === "string" && detail.length > 0) {
        // Caso comune: FastAPI ritorna {detail: "Invalid email or password"}.
        setSubmitError(humanizeLoginError(detail));
      } else if (status != null && errObj?.response) {
        // FastAPI 422 array di issues / payload strutturato.
        const { title, description } = translateAxiosError(status, errObj.response.data);
        setSubmitError(description ? `${title} · ${description}` : title);
      } else {
        setSubmitError(humanizeLoginError(errObj?.message ?? "Errore sconosciuto"));
      }
    }
  }

  const footer: ReactNode = (
    <>
      Non hai un account?{" "}
      <Link to="/signup" data-testid="auth-go-signup">
        Creane uno gratuito
      </Link>
    </>
  );

  return (
    <AuthCard
      state="login"
      eyebrow="Accedi al tuo studio"
      title="Bentornato"
      sub={
        <>
          Continua il tuo lavoro su <b>UC1 · Trave bi-appoggiata</b> e altri 4
          progetti.
        </>
      }
      footer={footer}
    >
      <form className="card-form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <AuthField
          label="Email"
          icon={Mail}
          type="email"
          autoComplete="email"
          placeholder="federico@studio.it"
          error={errors.email?.message}
          data-testid="auth-email"
          {...register("email")}
        />

        <AuthField
          label="Password"
          labelAside={{ label: "Dimenticata?", to: "/forgot-password" }}
          icon={Lock}
          type={showPwd ? "text" : "password"}
          autoComplete="current-password"
          placeholder="••••••••••••"
          error={errors.password?.message}
          data-testid="auth-password"
          trail={
            <button
              type="button"
              className="field-trail"
              aria-label={showPwd ? "Nascondi password" : "Mostra password"}
              data-testid="auth-show-pwd-toggle"
              onClick={() => setShowPwd((p) => !p)}
            >
              {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          }
          {...register("password")}
        />

        <label className="checkbox-row" data-testid="auth-stay-logged">
          <input
            type="checkbox"
            style={{ position: "absolute", opacity: 0, pointerEvents: "none" }}
            data-testid="auth-stay-logged-input"
            {...register("stayLogged")}
          />
          <span className={`checkbox${stayLogged ? " checked" : ""}`} aria-hidden="true">
            <Check size={11} strokeWidth={3} />
          </span>
          <span>Resta connesso per 30 giorni</span>
        </label>

        {submitError && (
          <div className="info-banner" role="alert" data-testid="auth-error">
            <span>{submitError}</span>
          </div>
        )}

        <button
          type="submit"
          className="btn-primary btn-lg"
          disabled={isSubmitting}
          data-testid="auth-submit"
        >
          {isSubmitting ? (
            "Attendere…"
          ) : (
            <>
              Entra in FEA Pro
              <ArrowRight size={14} />
            </>
          )}
        </button>

        <AuthDivider />
        <SSOButtons />
      </form>
    </AuthCard>
  );
}


/**
 * Traduce gli errori più comuni di /api/auth/login in italiano.
 * Estratto da AuthScreen legacy (v2.1.4).
 */
function humanizeLoginError(detail: string): string {
  const lower = detail.toLowerCase();
  if (lower.includes("invalid email or password")) {
    return "Email o password non validi.";
  }
  if (lower.includes("network") || lower.includes("failed to fetch")) {
    return "Impossibile contattare il server. Riprova fra qualche secondo.";
  }
  return detail;
}
