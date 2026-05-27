/**
 * AuthCard · v2.7.0 Phase 4.1 mockup-driven (F.4)
 *
 * Wrapper standard delle 4 auth pages. Gestisce eyebrow + title + sub +
 * optional back-link (state forgot) + optional centered head (state verify)
 * + form children + optional footer.
 *
 * Reference mockup: ui_kits/webapp_desktop/Auth.html:
 *   - LOGIN  righe 183-244
 *   - SIGNUP righe 247-325
 *   - FORGOT righe 328-363 (con `card-back`)
 *   - VERIFY righe 366-407 (con `card-head-center` + `auth-card-verify`)
 */
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export type AuthState = "login" | "signup" | "forgot" | "verify";

interface AuthCardBack {
  label: string;
  to: string;
}

interface AuthCardProps {
  state: AuthState;
  /** Pre-title small caps. Optional perché verify usa anche centered icon. */
  eyebrow?: string;
  /** Card title (h2). Può essere ReactNode per supportare `<br />`. */
  title: ReactNode;
  /** Sotto-titolo descrittivo. Supporta `<b>` highlight. */
  sub?: ReactNode;
  /** Back link sopra eyebrow (es. forgot → "Torna al login"). */
  back?: AuthCardBack;
  /** Centered head (verify state): align center + add `auth-card-verify` mod. */
  centered?: boolean;
  /** Form / body content. */
  children: ReactNode;
  /** Footer link riga (es. "Non hai un account? Creane uno gratuito"). */
  footer?: ReactNode;
  /** Optional icon node renderizzata sopra eyebrow (verify state: 64x64). */
  icon?: ReactNode;
  /** Override data-testid (default `auth-{state}-page`). */
  testId?: string;
}

export function AuthCard({
  state,
  eyebrow,
  title,
  sub,
  back,
  centered,
  children,
  footer,
  icon,
  testId,
}: AuthCardProps) {
  const cardClass = ["auth-card", centered ? "auth-card-verify" : ""].filter(Boolean).join(" ");
  const headClass = ["card-head", centered ? "card-head-center" : ""].filter(Boolean).join(" ");
  return (
    <section className={cardClass} data-state={state} data-testid={testId ?? `auth-${state}-page`}>
      <header className={headClass}>
        {back && (
          <Link to={back.to} className="card-back" data-testid="auth-back-link">
            <ArrowLeft size={14} />
            {back.label}
          </Link>
        )}
        {icon}
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h2 className="card-title">{title}</h2>
        {sub && <p className="card-sub">{sub}</p>}
      </header>
      {children}
      {footer && <footer className="card-foot">{footer}</footer>}
    </section>
  );
}
