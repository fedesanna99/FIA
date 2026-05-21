/**
 * CollabAvatars (alpha.18) — Sprint 4 / Asse G3.
 *
 * Avatar stack di utenti collaboratori sovrapposti (mockup v1.3). In
 * alpha.18 mostra solo l'utente autenticato (se loggato) + placeholder
 * "+N" se ci sono altri. La logica multi-user real-time arrivera' con
 * il backend collab (Sprint 5 v1.5 piano Asse F).
 *
 * Stato visivo:
 *  - 1 avatar circolare (iniziali email) accent-subtle bg
 *  - badge "live" dot verde con pulse animation
 *  - tooltip mostra email completa
 */
import { useAuthStore } from "../../../store/authStore";
import { Tooltip } from "../../ui/Tooltip";


function initials(email: string): string {
  const local = email.split("@")[0] || email;
  // "fedesanna99" → "FE", "mario.rossi" → "MR"
  const parts = local.split(/[._-]/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return local.slice(0, 2).toUpperCase();
}


export function CollabAvatars() {
  const user = useAuthStore((s) => s.user);

  // Non mostriamo nulla se anonimo: TopBar avra' gia' il pulsante "Accedi".
  if (!user) return null;

  return (
    <Tooltip
      content={
        <div>
          <div className="font-semibold">{user.email}</div>
          <div className="text-ink-muted text-[11px] mt-0.5">
            Tu · sessione live
          </div>
        </div>
      }
    >
      <div
        className="relative flex items-center"
        data-testid="topbar-collab"
      >
        <div className="w-6 h-6 rounded-full bg-accent-subtle border border-accent/40 flex items-center justify-center text-[10px] font-semibold text-accent">
          {initials(user.email)}
        </div>
        {/* Live indicator dot (pulse animation dal mockup) */}
        <span
          className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-success border border-bg-panel feapro-pulse"
          aria-label="online"
        />
      </div>
    </Tooltip>
  );
}
