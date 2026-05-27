/**
 * PasswordStrengthBars · v2.7.0 Phase 4.1 mockup-driven (F.5.1)
 *
 * 4-level indicator (weak/ok/good/strong) sotto al field password del
 * signup form. Logica brief decisione 11:
 *
 *   - `weak`   ( < 8 char)                              → 1 bar  · danger
 *   - `ok`     (8-11 char con 0-1 class)                → 2 bars · warn
 *   - `good`   ( 8-11 char con ≥2 class) OR ( ≥12 char) → 3 bars · accent
 *   - `strong` ( ≥12 char e ≥3 class)                    → 4 bars · success
 *
 * `class` ∈ { upper, number, special }: indica i tipi di carattere
 * presenti (lowercase è dato per scontato sui form auth).
 *
 * CSS data-strength selettori in auth.css (.pw-strength[data-strength="*"]):
 * il colore dei bar è derivato dal data-attribute, non da inline style.
 *
 * Reference mockup: ui_kits/webapp_desktop/Auth.html righe 287-292.
 */
export type PasswordStrength = "weak" | "ok" | "good" | "strong";

const STRENGTH_LABELS: Record<PasswordStrength, string> = {
  weak: "Troppo debole",
  ok: "Sufficiente",
  good: "Buona",
  strong: "Robusta · ottima scelta",
};

/**
 * Compute strength category da una password plain.
 *
 * Vince il mockup: thresholds e classi seguono brief decisione 11.
 * NON usare entropia bit-based (zxcvbn ecc.) — out of scope per v2.7.0.
 */
export function computePasswordStrength(pwd: string): PasswordStrength {
  if (pwd.length < 8) return "weak";
  const hasUpper = /[A-Z]/.test(pwd);
  const hasNumber = /\d/.test(pwd);
  const hasSpecial = /[^a-zA-Z0-9]/.test(pwd);
  const classes = [hasUpper, hasNumber, hasSpecial].filter(Boolean).length;
  if (pwd.length >= 12 && classes >= 3) return "strong";
  if (pwd.length >= 12 || classes >= 2) return "good";
  return "ok";
}

interface Props {
  password: string;
}

export function PasswordStrengthBars({ password }: Props) {
  const strength = computePasswordStrength(password);
  return (
    <div
      className="pw-strength"
      data-strength={strength}
      data-testid="pw-strength"
    >
      <div className="pw-bars">
        <span />
        <span />
        <span />
        <span />
      </div>
      <span className="pw-label">{STRENGTH_LABELS[strength]}</span>
    </div>
  );
}
