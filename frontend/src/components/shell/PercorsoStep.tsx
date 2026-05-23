/**
 * PercorsoStep (Precision v2.0) — template C2-C7 wrapper di tutti gli step
 * del percorso guidato.
 *
 * Compone:
 *   - <PercorsoStepper> top (già esistente) con currentStep
 *   - header: eyebrow "STEP N · TITLE" + h2 + subtitle
 *   - body grid: 1fr (main form) · 280px (aside help "Perché te lo chiediamo")
 *   - footer: validation chip + back + forward CTA
 *
 * Animations:
 *   - Body transition: `animate-fade-in` (120ms) sul re-mount via `key={step}`,
 *     così quando il consumer cambia step il body fa fade vs nessuna animazione
 *     (sensazione di pagina caricata)
 *   - Validation: cambio tone con `transition-colors duration-fast`
 *   - Forward CTA: disabled state con cursor-not-allowed + opacity 50%
 *
 * API stateless: validation è un oggetto `{ status, message }` passato dal
 * consumer. Lo step component non valida.
 */
import { type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Check, AlertTriangle, X } from "lucide-react";
import { Button, Chip } from "../ui";
import { cn } from "../ui/cn";
import { PercorsoStepper, PERCORSO_STEPS_6, type PercorsoStep as StepDef } from "./PercorsoStepper";

interface Props {
  /** 1-based index dello step corrente. */
  step: number;
  /** Override degli step (default = PERCORSO_STEPS_6). */
  steps?: readonly StepDef[];
  /** Titolo display dello step ("Definisci la geometria del telaio"). */
  title: string;
  /** Sottotitolo sotto h2 ("Inserisci nodi e elementi …"). */
  subtitle?: string;
  /** Help content per la colonna destra ("Perché te lo chiediamo"). Opzionale. */
  help?: ReactNode;
  /** Body principale (form fields, viewport, lista). */
  children: ReactNode;
  validation?: {
    status: "ok" | "warn" | "error" | "pending";
    message: string;
  };
  onBack?: () => void;
  onForward?: () => void;
  forwardLabel?: string;
  forwardDisabled?: boolean;
  /** Click su uno step → naviga (es. back). */
  onStepClick?: (stepIndex: number) => void;
  className?: string;
}

const VALIDATION_META = {
  ok:      { icon: Check,         tone: "success" as const,  label: "OK" },
  warn:    { icon: AlertTriangle, tone: "warn"    as const,  label: "Attenzione" },
  error:   { icon: X,             tone: "danger"  as const,  label: "Errore" },
  pending: { icon: Check,         tone: "neutral" as const,  label: "In attesa" },
};

export function PercorsoStep({
  step,
  steps = PERCORSO_STEPS_6,
  title,
  subtitle,
  help,
  children,
  validation,
  onBack,
  onForward,
  forwardLabel,
  forwardDisabled,
  onStepClick,
  className,
}: Props) {
  const currentStepMeta = steps[step - 1];
  const stepLabel = currentStepMeta?.label ?? `Step ${step}`;
  const meta = validation && VALIDATION_META[validation.status];
  const Icon = meta?.icon;

  return (
    <div className={cn("flex flex-col h-full bg-bg", className)} data-testid="percorso-step">

      {/* Persistent stepper */}
      <PercorsoStepper steps={steps} currentStep={step} onStepClick={onStepClick} />

      {/* Header */}
      <header className="px-6 pt-5 pb-4 border-b border-border bg-bg-panel">
        <div className="font-mono text-[10px] uppercase tracking-wide-4 text-ink-3 mb-2">
          Step {step} / {steps.length} · {stepLabel}
        </div>
        <h2 className="font-display text-2xl font-semibold tracking-tight-2 text-ink leading-tight">
          {title}
        </h2>
        {subtitle && (
          <p className="text-md text-ink-2 leading-relaxed max-w-[64ch] mt-1.5">{subtitle}</p>
        )}
      </header>

      {/* Body grid · fade-in al cambio step */}
      <div
        key={step}
        className={cn(
          "grid flex-1 overflow-hidden animate-fade-in",
          help ? "grid-cols-1 lg:grid-cols-[1fr_280px]" : "grid-cols-1",
        )}
      >
        {/* Main */}
        <main className="overflow-y-auto px-6 py-5">{children}</main>

        {/* Aside · Perché te lo chiediamo */}
        {help && (
          <aside
            className="border-l border-border bg-bg-panel overflow-y-auto px-5 py-5 hidden lg:block"
            data-testid="percorso-step-help"
          >
            <div className="font-mono text-[10px] uppercase tracking-wide-4 text-ink-3 mb-3">
              Perché te lo chiediamo
            </div>
            <div className="text-md text-ink-2 leading-relaxed space-y-3">
              {help}
            </div>
          </aside>
        )}
      </div>

      {/* Footer · validation + nav */}
      <footer className="border-t border-border bg-bg-panel px-6 py-3 flex items-center justify-between gap-4">
        {validation && Icon ? (
          <Chip tone={meta!.tone} icon={<Icon className="w-3 h-3" strokeWidth={2.5} aria-hidden="true" />}>
            {validation.message}
          </Chip>
        ) : (
          <div />
        )}
        <div className="flex items-center gap-2">
          {onBack && (
            <Button variant="ghost" size="md" iconLeft={<ArrowLeft className="w-3.5 h-3.5" />} onClick={onBack}>
              Indietro
            </Button>
          )}
          {onForward && (
            <Button
              variant="primary"
              size="md"
              iconRight={<ArrowRight className="w-3.5 h-3.5" />}
              onClick={onForward}
              disabled={forwardDisabled}
              data-testid="percorso-step-forward"
            >
              {forwardLabel ?? (step >= steps.length ? "Concludi" : "Avanti")}
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}
