/**
 * AuthField · v2.7.0 Phase 4.1 mockup-driven (F.4)
 *
 * Field primitive con label (+ optional aside link) + icon + input + optional
 * trail (eyeball toggle, select chevron, ecc.) + hint + error.
 *
 * Designed per integrarsi con react-hook-form via `register`. Usa
 * `forwardRef` così l'input nativo riceve il `ref` di register
 * direttamente.
 *
 * Reference mockup: ui_kits/webapp_desktop/Auth.html righe 193-213 (login
 * Email + Password con eye-toggle), 272-279 (signup Email + hint),
 * 295-308 (signup select Ruolo con field-trail chevron).
 */
import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";

interface AuthFieldAside {
  label: string;
  to: string;
}

interface AuthFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Field label (sempre presente). */
  label: string;
  /** Inline link a destra del label (es. "Dimenticata?" sul login pwd). */
  labelAside?: AuthFieldAside;
  /** Lucide icon a sinistra dell'input. */
  icon?: LucideIcon;
  /** Slot a destra dell'input (eyeball toggle, chevron, badge, ecc.). */
  trail?: ReactNode;
  /** Hint statico sotto l'input (mockup `field-hint`). */
  hint?: string;
  /** Error message (sostituisce hint quando presente). */
  error?: string;
}

export const AuthField = forwardRef<HTMLInputElement, AuthFieldProps>(
  function AuthField(
    { label, labelAside, icon: Icon, trail, hint, error, className, ...inputProps },
    ref,
  ) {
    const inputClass = ["", className ?? ""].filter(Boolean).join(" ").trim();
    return (
      <label className="field">
        {labelAside ? (
          <span className="field-label-row">
            <span className="field-label">{label}</span>
            <Link className="field-aside" to={labelAside.to} data-testid="auth-field-aside">
              {labelAside.label}
            </Link>
          </span>
        ) : (
          <span className="field-label">{label}</span>
        )}
        <div className="field-input">
          {Icon && <Icon className="field-icon" width={14} height={14} aria-hidden="true" />}
          <input ref={ref} className={inputClass || undefined} {...inputProps} />
          {trail}
        </div>
        {error ? (
          <span className="field-hint" data-error="true" style={{ color: "var(--danger)" }}>
            {error}
          </span>
        ) : hint ? (
          <span className="field-hint">{hint}</span>
        ) : null}
      </label>
    );
  },
);
