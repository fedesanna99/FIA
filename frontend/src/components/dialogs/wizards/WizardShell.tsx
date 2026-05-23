/**
 * WizardShell (v1.5 Task 31) — pattern riusabile per qualunque wizard.
 *
 * Modal overlay con:
 *  - header: breadcrumb di contesto (icon + label) + close X
 *  - step indicator: dot + connecting line per ogni step (done/current/pending)
 *  - body: contenuto dello step corrente (scrollabile, max 60vh)
 *  - footer: Indietro/Annulla a sinistra · Avanti/Esegui a destra
 *
 * Le sub-view di ogni step sono passate via children, controllate dal parent
 * che gestisce lo state (config wizard) e il routing degli step.
 *
 * Riusato da:
 *   - SismicaTHWizard (3 step: Direzioni → Accelerogrammi → Parametri)
 *   - ImportWizard    (4 step: Fonte → File → Anteprima → Conferma)  [Task 29]
 *   - Altri wizard futuri (pushover, arc-length, report, ...)
 */
import { Fragment, type ReactNode } from "react";
import { ChevronRight, ArrowRight, Play, type LucideIcon } from "lucide-react";
import { useModalBackButton } from "../../../hooks/useModalBackButton";


export interface WizardCrumb {
  label: string;
  icon: LucideIcon;
}


export interface WizardStep {
  id: string;
  label: string;
}


interface WizardShellProps {
  open: boolean;
  title: string;
  breadcrumb: WizardCrumb[];
  steps: WizardStep[];
  currentStep: number;
  onClose: () => void;
  onBack?: () => void;
  onNext?: () => void;
  onSubmit?: () => void;
  nextLabel?: string;
  submitLabel?: string;
  canProceed?: boolean;
  isSubmitting?: boolean;
  children: ReactNode;
  /** Larghezza max in px (default 640). */
  maxWidth?: number;
}


export function WizardShell({
  open, title, breadcrumb, steps, currentStep, onClose, onBack, onNext, onSubmit,
  nextLabel = "Avanti", submitLabel = "Esegui", canProceed = true, isSubmitting = false,
  children, maxWidth = 640,
}: WizardShellProps) {
  // v1.6 S0 · B08: back hardware mobile chiude il wizard. Va prima del
  // early-return cosi' il hook si registra/deregistra coerentemente.
  useModalBackButton(open, onClose);
  if (!open) return null;
  const isLast = currentStep === steps.length - 1;

  return (
    <div
      className="fixed inset-0 z-dialog flex items-center justify-center bg-black/40 animate-fade-in"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="bg-bg-elevated border border-border-light shadow-dialog w-[calc(100vw-24px)] max-h-[calc(100vh-48px)] flex flex-col overflow-hidden animate-slide-up"
        style={{ maxWidth }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {/* Header con breadcrumb */}
        <header className="px-5 py-3.5 border-b border-border flex-shrink-0 bg-bg-panel">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wide-1 text-ink-3 font-semibold">
              {breadcrumb.map((b, i) => {
                const Icon = b.icon;
                const isLastCrumb = i === breadcrumb.length - 1;
                return (
                  <Fragment key={i}>
                    <span
                      className={`inline-flex items-center gap-1 ${isLastCrumb ? "text-ink" : ""}`}
                    >
                      <Icon className="w-3 h-3" /> {b.label}
                    </span>
                    {!isLastCrumb && <ChevronRight className="w-2.5 h-2.5 text-ink-4" />}
                  </Fragment>
                );
              })}
            </div>
          </div>

          {/* Step indicator Precision (dot sharp + connecting line) */}
          <div className="flex items-center gap-2">
            {steps.map((s, i) => {
              const done = i < currentStep;
              const current = i === currentStep;
              const dotClass = done
                ? "bg-success"
                : current
                ? "bg-accent ring-2 ring-accent/30"
                : "bg-bg-hover border border-border-light";
              return (
                <Fragment key={s.id}>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${dotClass} flex-shrink-0 transition-all`} />
                    <span
                      className={`font-mono text-[10px] uppercase tracking-wide-2 font-semibold ${
                        current ? "text-ink" : "text-ink-3"
                      }`}
                    >
                      {s.label}
                    </span>
                  </div>
                  {i < steps.length - 1 && (
                    <div
                      className={`flex-1 h-px transition-colors ${done ? "bg-success" : "bg-border"}`}
                    />
                  )}
                </Fragment>
              );
            })}
          </div>
          <div className="font-mono text-[10px] uppercase tracking-wide-1 text-ink-3 mt-2 font-semibold">
            Step {currentStep + 1} di {steps.length}
          </div>
        </header>

        {/* Content scrollabile */}
        <div className="px-5 py-5 max-h-[62vh] overflow-y-auto flex-1 min-h-0">
          {children}
        </div>

        {/* Footer Precision */}
        <footer className="px-5 py-3 border-t border-border flex items-center justify-between flex-shrink-0 bg-bg-panel">
          <button
            type="button"
            onClick={onBack || onClose}
            className="px-3 py-1.5 text-sm font-medium text-ink-2 hover:text-ink hover:bg-bg-hover transition-colors"
            data-testid="wizard-back"
          >
            {currentStep > 0 ? "← Indietro" : "Annulla"}
          </button>

          {isLast ? (
            <button
              type="button"
              onClick={onSubmit}
              disabled={!canProceed || isSubmitting}
              className="inline-flex items-center gap-1.5 bg-success hover:bg-success/90 text-white border border-success text-sm font-medium px-4 py-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              data-testid="wizard-submit"
            >
              {isSubmitting && (
                <span className="inline-block w-3 h-3 border-[1.5px] border-white/40 border-t-white animate-spin" />
              )}
              {isSubmitting ? "Esecuzione…" : submitLabel}
              {!isSubmitting && <Play className="w-3 h-3" />}
            </button>
          ) : (
            <button
              type="button"
              onClick={onNext}
              disabled={!canProceed}
              className="inline-flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-white border border-accent text-sm font-medium px-4 py-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              data-testid="wizard-next"
            >
              {nextLabel}
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
