import { create } from "zustand";

export type ToastLevel = "success" | "error" | "info" | "warning";

export interface Toast {
  id: number;
  level: ToastLevel;
  message: string;
  ttlMs: number;
}

interface ToastState {
  toasts: Toast[];
  push: (level: ToastLevel, message: string, ttlMs?: number) => void;
  dismiss: (id: number) => void;
}

let counter = 0;

/**
 * v1.5.2 Task 38: durata auto-dismiss tone-aware. Gli errori restano piu'
 * a lungo (6s) per dare tempo di leggere, le info/success spariscono prima.
 */
const DEFAULT_TTL: Record<ToastLevel, number> = {
  info:    4000,
  success: 3500,
  warning: 5000,
  error:   6000,
};

/** Massimo numero di toast visibili contemporaneamente: i piu' vecchi vengono dismissati. */
const STACK_LIMIT = 3;

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  push: (level, message, ttlMs) => {
    const id = ++counter;
    const duration = ttlMs ?? DEFAULT_TTL[level];
    set((s) => {
      if (s.toasts.some((t) => t.level === level && t.message === message)) {
        return s;
      }
      const next = [...s.toasts, { id, level, message, ttlMs: duration }];
      // v1.5.2 Task 38: stack limit — droppa i piu' vecchi per non
      // sommergere lo schermo con catene di errori HTTP.
      while (next.length > STACK_LIMIT) next.shift();
      return { toasts: next };
    });
    if (duration > 0 && Number.isFinite(duration)) {
      setTimeout(() => get().dismiss(id), duration);
    }
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/** Helper per chiamare il toast da posti non-React (api client). */
export function toast(level: ToastLevel, message: string, ttlMs?: number) {
  useToastStore.getState().push(level, message, ttlMs);
}
