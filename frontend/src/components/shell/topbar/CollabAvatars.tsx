/**
 * CollabAvatars (alpha.30) — refactor mockup v1.3.
 *
 * Stack di avatar circolari sovrapposti per utenti in collab. Ogni avatar
 * ha gradient determinato dall'hash dell'id (palette mockup), border 2px
 * bg-panel per separazione visiva quando si sovrappongono, e tooltip con
 * nome + attivita'. Stato anonimo (nessun utente loggato) → null.
 *
 * In alpha.30 mostriamo solo l'utente autenticato (1 avatar): la logica
 * multi-user real-time arriverà col backend collab (Sprint 5 v1.5 Asse F).
 * Quando ci saranno N>1 collaboratori, gli avatar si sovrappongono in
 * stack con -space-x-1.5 (mockup pattern).
 */
import { useAuthStore } from "../../../store/authStore";
import { Tooltip } from "../../ui/Tooltip";

interface Collaborator {
  id: string;
  name: string;
  initials: string;
  activity: string;
}

const GRADIENT_PALETTE = [
  "linear-gradient(135deg, #d85a30, #993c1d)",
  "linear-gradient(135deg, #1da97a, #138855)",
  "linear-gradient(135deg, #534ab7, #7f77dd)",
  "linear-gradient(135deg, #e49c38, #854f0b)",
];

function gradientFor(user: Collaborator): string {
  let hash = 0;
  for (let i = 0; i < user.id.length; i++) {
    hash = ((hash << 5) - hash) + user.id.charCodeAt(i);
  }
  return GRADIENT_PALETTE[Math.abs(hash) % GRADIENT_PALETTE.length];
}

function initials(email: string): string {
  const local = email.split("@")[0] || email;
  const parts = local.split(/[._-]/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return local.slice(0, 2).toUpperCase();
}

export function CollabAvatars() {
  const user = useAuthStore((s) => s.user);

  // Stato anonimo: nessuna pillola (la topbar mostrera' "Accedi").
  if (!user) return null;

  // Per ora un solo collaboratore (l'utente loggato). Lo schema e' pronto
  // per N>1 quando il backend collab esporra' la lista active users.
  const collaborators: Collaborator[] = [
    {
      id: user.id ?? user.email,
      name: user.email,
      initials: initials(user.email),
      activity: "Tu · sessione live",
    },
  ];

  return (
    <div
      className="flex items-center -space-x-1.5 flex-shrink-0"
      data-testid="topbar-collab"
    >
      {collaborators.map((u, i) => (
        <Tooltip
          key={u.id}
          content={
            <div>
              <div className="font-semibold">{u.name}</div>
              <div className="text-ink-muted text-[11px] mt-0.5">{u.activity}</div>
            </div>
          }
        >
          <div
            className="relative w-6 h-6 rounded-full text-white text-[10px] font-semibold flex items-center justify-center border-2 border-bg-panel"
            style={{ background: gradientFor(u), zIndex: 10 - i }}
          >
            {u.initials}
            {/* Live indicator dot solo sul primo avatar (utente corrente) */}
            {i === 0 && (
              <span
                className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-success border border-bg-panel feapro-pulse"
                aria-label="online"
              />
            )}
          </div>
        </Tooltip>
      ))}
    </div>
  );
}
