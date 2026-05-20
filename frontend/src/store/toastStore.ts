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

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  push: (level, message, ttlMs = 4000) => {
    const id = ++counter;
    set((s) => ({ toasts: [...s.toasts, { id, level, message, ttlMs }] }));
    if (ttlMs > 0) {
      setTimeout(() => get().dismiss(id), ttlMs);
    }
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/** Helper per chiamare il toast da posti non-React (api client). */
export function toast(level: ToastLevel, message: string, ttlMs?: number) {
  useToastStore.getState().push(level, message, ttlMs);
}
