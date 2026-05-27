/**
 * SignupPage · v2.7.0 Phase 4.1 mockup-driven (F.5 completa)
 *
 * State 2 di 4 (SIGNUP). Implementazione completa secondo mockup
 * ui_kits/webapp_desktop/Auth.html righe 247-325.
 *
 * Form 6 campi (5 collected + 1 consenso):
 *   1. Nome           field-grid-2 sinistra
 *   2. Cognome        field-grid-2 destra
 *   3. Email          field con icon Mail + hint
 *   4. Password       field con icon Lock + PasswordStrengthBars live
 *   5. Ruolo          field-input-select con 5 options (Pydantic Literal)
 *   6. Accepted terms checkbox custom (required: True ⇒ submit; False ⇒ 422)
 *
 * Backend extension v2.7.0 F.5 (D.2=B): payload register esteso con
 * nome/cognome/ruolo_professionale + accepted_terms. Migration users
 * idempotente per i 4 campi nullable (pattern v2.6.4 A.2). Backward
 * compat: legacy register({email,password}) continua a funzionare.
 *
 * Submit handler:
 *   - apiRegister(payload esteso) → AuthResponse {token, user}
 *   - setAuth(token, user) → utente loggato immediatamente
 *   - navigate("/", replace) → redirect a home (D.4=A skipping verify
 *     state in flow di produzione; verify accessibile solo via URL diretto
 *     /verify-email?token=… per testing)
 *
 * Error handling: messaggi italiani umani per 409 (email duplicate),
 * 422 (consenso mancante), generic fallback.
 */
import { useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check, ChevronDown, Lock, Mail, User as UserIcon } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { register as apiRegister } from "../api/auth";
import { useAuthStore } from "../store/authStore";

import { AuthCard } from "./components/AuthCard";
import { AuthField } from "./components/AuthField";
import { PasswordStrengthBars } from "./components/PasswordStrengthBars";


const RUOLI = [
  { value: "ingegnere", label: "Ingegnere strutturista" },
  { value: "architetto", label: "Architetto" },
  { value: "docente", label: "Docente / Ricercatore" },
  { value: "studente", label: "Studente" },
  { value: "altro", label: "Altro" },
] as const;


const signupSchema = z.object({
  nome: z.string().trim().min(1, "Nome richiesto").max(80),
  cognome: z.string().trim().min(1, "Cognome richiesto").max(80),
  email: z.string().email("Email non valida"),
  password: z
    .string()
    .min(8, "Almeno 8 caratteri")
    .max(72, "Massimo 72 caratteri"),
  ruolo: z.enum(["ingegnere", "architetto", "docente", "studente", "altro"], {
    message: "Seleziona un ruolo professionale",
  }),
  acceptedTerms: z.literal(true, {
    message: "Devi accettare termini e privacy policy",
  }),
});

type SignupForm = z.infer<typeof signupSchema>;


export function SignupPage() {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      nome: "",
      cognome: "",
      email: "",
      password: "",
      // Cast: zod literal(true) accetta solo true; React permette undefined
      // initial value finché il submit forza la validation.
      ruolo: undefined as unknown as SignupForm["ruolo"],
      acceptedTerms: undefined as unknown as true,
    },
    mode: "onSubmit",
  });

  const passwordValue = watch("password") ?? "";
  const acceptedTerms = watch("acceptedTerms");

  async function onSubmit(data: SignupForm): Promise<void> {
    setSubmitError(null);
    try {
      const res = await apiRegister({
        email: data.email.trim(),
        password: data.password,
        nome: data.nome,
        cognome: data.cognome,
        ruolo_professionale: data.ruolo,
        accepted_terms: data.acceptedTerms,
      });
      setAuth(res.token, res.user);
      navigate("/", { replace: true });
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        (err as Error)?.message ??
        "Errore sconosciuto";
      setSubmitError(humanizeSignupError(String(detail)));
    }
  }

  const footer: ReactNode = (
    <>
      Hai già un account?{" "}
      <Link to="/login" data-testid="auth-go-login">
        Accedi
      </Link>
    </>
  );

  return (
    <AuthCard
      state="signup"
      eyebrow="Crea il tuo account"
      title="Inizia in 30 secondi"
      sub={
        <>
          Nessuna carta richiesta. Tier <b>Free</b>: 5 progetti, 13 elementi,
          EC3 + 9 template.
        </>
      }
      footer={footer}
    >
      <form className="card-form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="field-grid-2">
          <AuthField
            label="Nome"
            type="text"
            autoComplete="given-name"
            placeholder="Federico"
            error={errors.nome?.message}
            data-testid="auth-signup-nome"
            {...register("nome")}
          />
          <AuthField
            label="Cognome"
            type="text"
            autoComplete="family-name"
            placeholder="Sanna"
            error={errors.cognome?.message}
            data-testid="auth-signup-cognome"
            {...register("cognome")}
          />
        </div>

        <AuthField
          label="Email professionale"
          icon={Mail}
          type="email"
          autoComplete="email"
          placeholder="federico@studio.it"
          hint="Usata per recupero password e fatture."
          error={errors.email?.message}
          data-testid="auth-signup-email"
          {...register("email")}
        />

        <div>
          <AuthField
            label="Password"
            icon={Lock}
            type="password"
            autoComplete="new-password"
            placeholder="Almeno 8 caratteri"
            error={errors.password?.message}
            data-testid="auth-signup-password"
            {...register("password")}
          />
          {passwordValue && <PasswordStrengthBars password={passwordValue} />}
        </div>

        <label className="field" data-testid="auth-signup-ruolo-field">
          <span className="field-label">Ruolo professionale</span>
          <div className="field-input field-input-select">
            <UserIcon className="field-icon" width={14} height={14} aria-hidden="true" />
            <select
              defaultValue=""
              data-testid="auth-signup-ruolo"
              {...register("ruolo")}
            >
              <option value="" disabled>
                Seleziona…
              </option>
              {RUOLI.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            <ChevronDown className="field-trail" width={14} height={14} aria-hidden="true" />
          </div>
          {errors.ruolo?.message && (
            <span className="field-hint" data-error="true" style={{ color: "var(--danger)" }}>
              {errors.ruolo.message}
            </span>
          )}
        </label>

        <label className="checkbox-row" data-testid="auth-signup-accepted-terms">
          <input
            type="checkbox"
            style={{ position: "absolute", opacity: 0, pointerEvents: "none" }}
            data-testid="auth-signup-accepted-terms-input"
            {...register("acceptedTerms")}
          />
          <span className={`checkbox${acceptedTerms ? " checked" : ""}`} aria-hidden="true">
            <Check size={11} strokeWidth={3} />
          </span>
          <span>
            Accetto <Link to="/terms" target="_blank" rel="noopener">termini</Link> e{" "}
            <Link to="/privacy" target="_blank" rel="noopener">privacy policy</Link>
          </span>
        </label>
        {errors.acceptedTerms?.message && (
          <span className="field-hint" data-error="true" style={{ color: "var(--danger)" }}>
            {errors.acceptedTerms.message}
          </span>
        )}

        {submitError && (
          <div className="info-banner" role="alert" data-testid="auth-error">
            <span>{submitError}</span>
          </div>
        )}

        <button
          type="submit"
          className="btn-primary btn-lg"
          disabled={isSubmitting}
          data-testid="auth-signup-submit"
        >
          {isSubmitting ? "Creando l'account…" : "Crea account gratuito"}
        </button>
      </form>
    </AuthCard>
  );
}


/**
 * Traduce gli errori più comuni di /api/auth/register in italiano.
 */
function humanizeSignupError(detail: string): string {
  const lower = detail.toLowerCase();
  if (lower.includes("already exists") || lower.includes("already registered")) {
    return "Esiste già un account con questa email. Prova ad accedere.";
  }
  if (lower.includes("devi accettare termini")) {
    // Pass-through del messaggio backend italiano (422 accepted_terms).
    return detail;
  }
  if (lower.includes("network") || lower.includes("failed to fetch")) {
    return "Impossibile contattare il server. Riprova fra qualche secondo.";
  }
  return detail;
}
