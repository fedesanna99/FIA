/**
 * notificationsStore (v1.7-polish-pass2 T2).
 *
 * Store dedicato per le notifiche **persistenti** dell'app (bell badge
 * in topbar, sheet/drawer future). Separato da `toastStore` che gestisce
 * solo i toast transient (auto-dismiss 3-6s).
 *
 * Use case:
 *   - "Analisi statica completata" — l'utente vuole vederla anche se ha
 *     chiuso il toast in 4 secondi.
 *   - "Modello salvato online" — log persistente.
 *   - "Errore solver" — deve restare visibile per debug.
 *
 * API:
 *   - `push({ level, title, message? })` → aggiunge una notifica (max 50).
 *   - `markRead(id)` → marca singola come letta.
 *   - `markAllRead()` → marca tutte.
 *   - `dismiss(id)` → rimuove dalla lista.
 *   - `clear()` → svuota tutto.
 *   - `unreadCount` → conteggio derivato (selector).
 *
 * Persistenza: per ora in-memory. v2.0 candidate per backend sync.
 *
 * NOTE: questo store NON sostituisce `useToastStore`, è additivo. La
 * TopBar bell counter ora legge da qui invece di contare toasts
 * error/warning (che spariscono in 5-6s).
 */
import { create } from "zustand";

export type NotificationLevel = "info" | "success" | "warning" | "error";

export interface Notification {
  id: number;
  level: NotificationLevel;
  title: string;
  message?: string;
  ts: number;
  read: boolean;
}

interface NotificationsState {
  items: Notification[];
  push: (n: Omit<Notification, "id" | "ts" | "read">) => void;
  markRead: (id: number) => void;
  markAllRead: () => void;
  dismiss: (id: number) => void;
  clear: () => void;
}

const MAX_ITEMS = 50;
let counter = 0;

export const useNotificationsStore = create<NotificationsState>((set) => ({
  items: [],
  push: (n) =>
    set((s) => {
      const next: Notification = {
        id: ++counter,
        ts: Date.now(),
        read: false,
        ...n,
      };
      // Cap a 50: drop il più vecchio (head).
      const items = [next, ...s.items].slice(0, MAX_ITEMS);
      return { items };
    }),
  markRead: (id) =>
    set((s) => ({
      items: s.items.map((it) => (it.id === id ? { ...it, read: true } : it)),
    })),
  markAllRead: () =>
    set((s) => ({ items: s.items.map((it) => ({ ...it, read: true })) })),
  dismiss: (id) =>
    set((s) => ({ items: s.items.filter((it) => it.id !== id) })),
  clear: () => set({ items: [] }),
}));

/** Helper imperativo per dispatch fuori da React components. */
export function notify(
  level: NotificationLevel,
  title: string,
  message?: string,
): void {
  useNotificationsStore.getState().push({ level, title, message });
}
