/**
 * OTPInput · v2.7.0 Phase 4.1 mockup-driven (F.7.1)
 *
 * 6-cells (default) single-char input row con auto-advance + backspace
 * focus prev. Behavior estratto verbatim da auth.js mockup righe 32-42.
 *
 * Controlled component: `value` (string up to `length` chars) + `onChange`
 * (new joined string). Caller gestisce lo stato; OTPInput non mantiene
 * stato interno se non il ref array per il focus.
 *
 * Accessibility:
 *   - inputMode="numeric" + pattern="[0-9]*" → mobile keyboard numerica
 *   - aria-label per ogni cell "Cifra N di M"
 *   - role implicit via input[type=text]
 *
 * Note: cell mostra value paddato con char "spazio" internamente per
 * mantenere allineamento focus. Il caller riceve solo la stringa reale
 * (trimEnd) tramite onChange.
 *
 * Reference mockup: ui_kits/webapp_desktop/auth.js righe 32-42;
 * ui_kits/webapp_desktop/Auth.html righe 386-393.
 */
import { useRef, type KeyboardEvent } from "react";

interface OTPInputProps {
  /** Lunghezza OTP. Default 6 (mockup). */
  length?: number;
  /** Stato corrente (joined string, length 0..length). */
  value: string;
  /** Callback con il nuovo joined value. */
  onChange: (next: string) => void;
  /** Disabilita tutti gli input (es. durante submit). */
  disabled?: boolean;
}

export function OTPInput({
  length = 6,
  value,
  onChange,
  disabled,
}: OTPInputProps) {
  const inputs = useRef<Array<HTMLInputElement | null>>([]);

  // Pad value a `length` con caratteri spazio per allineare gli input,
  // ma usa string vuota in render (".trim()" per ogni cell).
  const chars = value.padEnd(length, " ").split("").slice(0, length);

  function handleChange(idx: number, raw: string) {
    if (disabled) return;
    // Solo l'ultimo char inserito (mobile può inserire più di 1 char
    // tramite predictive — prendiamo l'ultimo).
    const ch = raw.length > 1 ? raw.slice(-1) : raw;
    const next = chars
      .map((c, i) => (i === idx ? ch : c))
      .join("")
      .trimEnd();
    onChange(next);
    if (ch && idx < length - 1) {
      inputs.current[idx + 1]?.focus();
    }
  }

  function handleKeyDown(idx: number, e: KeyboardEvent<HTMLInputElement>) {
    if (disabled) return;
    if (e.key === "Backspace" && !chars[idx]?.trim() && idx > 0) {
      // Cell vuoto + Backspace → focus prev cell (no value change here;
      // il consumer riceverà l'update dal prossimo char input).
      inputs.current[idx - 1]?.focus();
    }
  }

  return (
    <div className="otp-cells" data-testid="auth-otp-cells">
      {chars.map((ch, i) => {
        const real = ch.trim();
        return (
          <input
            key={i}
            ref={(el) => {
              inputs.current[i] = el;
            }}
            type="text"
            maxLength={1}
            value={real}
            disabled={disabled}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            inputMode="numeric"
            pattern="[0-9]*"
            aria-label={`Cifra ${i + 1} di ${length}`}
            data-testid={`auth-otp-cell-${i}`}
          />
        );
      })}
    </div>
  );
}
