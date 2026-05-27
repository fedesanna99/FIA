/**
 * AuthDivider · v2.7.0 Phase 4.1 mockup-driven (F.4)
 *
 * Hairline divider con label centrale "oppure" (uppercase mono). Usato fra
 * primary submit button e SSO row sul login state.
 *
 * Reference mockup: ui_kits/webapp_desktop/Auth.html riga 227
 * (`<div class="divider"><span>oppure</span></div>`).
 */
interface AuthDividerProps {
  /** Default "oppure". */
  label?: string;
}

export function AuthDivider({ label = "oppure" }: AuthDividerProps = {}) {
  return (
    <div className="divider" data-testid="auth-divider">
      <span>{label}</span>
    </div>
  );
}
