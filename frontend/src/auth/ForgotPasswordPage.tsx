/**
 * ForgotPasswordPage · v2.7.0 Phase 4.1 mockup-driven (F.6 completa)
 *
 * State 3 di 4 (FORGOT). Implementazione completa secondo mockup
 * ui_kits/webapp_desktop/Auth.html righe 328-363.
 *
 * Mock UI honest (D.3=A LOCKED brief Federico): NO API call backend.
 * L'endpoint `/api/auth/forgot-password` NON esiste e non sarà
 * implementato in v2.7.0 (SMTP setup richiede DNS + provider + ~3-4h
 * tecnico, scope Phase 8+ post-Stripe live). Il submit mostra un toast
 * info onesto con CTA email supporto invece di simulare un flow
 * funzionante.
 *
 * Copy onesto del toast:
 *   "Funzione email recovery in arrivo. Per ora, scrivi a
 *    supporto@feapro.dev — ti aiutiamo a recuperare l'account a mano."
 *
 * Il form rimane interattivo (email field + autofocus + zod validation)
 * così l'utente percepisce la pagina come "funzionante" — solo il
 * backend service è il placeholder.
 *
 * Reference mockup: ui_kits/webapp_desktop/Auth.html righe 328-363.
 */
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail } from "lucide-react";
import { Link } from "react-router-dom";

import { toast } from "../store/toastStore";

import { AuthCard } from "./components/AuthCard";
import { AuthField } from "./components/AuthField";
import { InfoBanner } from "./components/InfoBanner";


const forgotSchema = z.object({
  email: z.string().email("Inserisci un'email valida"),
});

type ForgotForm = z.infer<typeof forgotSchema>;


export function ForgotPasswordPage() {
  const [sent, setSent] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotForm>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: "" },
    mode: "onSubmit",
  });

  async function onSubmit(data: ForgotForm): Promise<void> {
    // D.3=A LOCKED: NO API call backend. Mock UI honest.
    const email = data.email.trim();
    toast(
      "info",
      "Funzione email recovery in arrivo. Per ora, scrivi a supporto@feapro.dev — ti aiutiamo a recuperare l'account a mano.",
      8_000,
    );
    setSent(email);
  }

  return (
    <AuthCard
      state="forgot"
      eyebrow="Recupera password"
      title={
        <>
          Ti rimandiamo dentro
          <br />
          in 2 minuti
        </>
      }
      sub={
        <>
          Inserisci l'email del tuo account. Ti invieremo un link valido{" "}
          <b>1 ora</b> per resettare la password.
        </>
      }
      back={{ label: "Torna al login", to: "/login" }}
      footer={
        <>
          Hai ricordato?{" "}
          <Link to="/login" data-testid="auth-forgot-back-to-login">
            Torna al login
          </Link>
        </>
      }
    >
      {sent ? (
        <div className="card-form" data-testid="auth-forgot-success">
          <InfoBanner icon={Mail} testId="auth-forgot-success-banner">
            Richiesta registrata per <b>{sent}</b>. Funzione email recovery in
            arrivo in versione futura — per ora{" "}
            <a
              href="mailto:supporto@feapro.dev"
              data-testid="auth-forgot-support-link"
            >
              scrivi a supporto@feapro.dev
            </a>
            : ti aiutiamo a recuperare l'account a mano.
          </InfoBanner>
        </div>
      ) : (
        <form className="card-form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <AuthField
            label="Email account"
            icon={Mail}
            type="email"
            autoComplete="email"
            placeholder="federico@studio.it"
            autoFocus
            error={errors.email?.message}
            data-testid="auth-forgot-email"
            {...register("email")}
          />

          <InfoBanner>
            Non ricevi l'email entro 5 minuti? Controlla lo spam, oppure{" "}
            <a
              href="mailto:supporto@feapro.dev"
              data-testid="auth-forgot-support-banner-link"
            >
              contatta supporto
            </a>
            .
          </InfoBanner>

          <button
            type="submit"
            className="btn-primary btn-lg"
            disabled={isSubmitting}
            data-testid="auth-forgot-submit"
          >
            {isSubmitting ? "Attendere…" : "Invia link reset"}
          </button>
        </form>
      )}
    </AuthCard>
  );
}
