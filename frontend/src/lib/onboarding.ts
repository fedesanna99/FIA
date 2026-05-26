/**
 * Onboarding hooks (v2.6.4 A.2).
 *
 * Espone:
 *   - `useUser()` → adapter dello `useAuthStore` con tipo `User` atteso
 *     dall'OnboardingTour.tsx handoff. Ritorna `{ user, isLoading, error }`.
 *   - `useMarkOnboardingComplete()` → callback che PATCH-a `completed: true`
 *     al backend e aggiorna lo store locale (optimistic).
 *   - `useResetOnboarding()` → reset a `completed: false` per "Rivedi tour"
 *     dal menu Help.
 *   - `startOnboardingTour()` → dispatcha `feapro:tour:start` event che
 *     l'OnboardingTour ascolta per ri-avvio immediato.
 *
 * Backend contract:
 *   - GET  /api/auth/me            → user.onboarding_completed: boolean
 *   - PATCH /api/auth/onboarding   body {completed: bool} → user updated
 */
import { useCallback } from "react";
import { useAuthStore } from "../store/authStore";
import { patchOnboarding, type AuthUser } from "../api/auth";

export interface User {
  id: string;
  email: string;
  onboarding_completed: boolean;
}

export interface UseUserReturn {
  user: User | null;
  isLoading: boolean;
  error?: Error;
}

/**
 * Adapter di `useAuthStore` con la forma esposta dal stub
 * `_onboarding-hooks.stub.ts`. Subscribe-aware: l'OnboardingTour si re-renderiza
 * quando `bootstrapping` finisce o `user` cambia (es. dopo setAuth).
 */
export function useUser(): UseUserReturn {
  const user = useAuthStore((s) => s.user);
  const bootstrapping = useAuthStore((s) => s.bootstrapping);
  return {
    user: user ? toTourUser(user) : null,
    isLoading: bootstrapping,
  };
}

/**
 * Mark onboarding completed (chiamato da OnboardingTour su skip/end/esc/backdrop).
 * Optimistic update dello store locale; in caso di errore network il flag
 * resta a true client-side (UX preferenza: niente reflashare il tour all'utente
 * che l'ha già chiuso) e il PATCH retry sarà al prossimo bootstrap.
 */
export function useMarkOnboardingComplete(): () => Promise<void> {
  return useCallback(async () => {
    const { token, user } = useAuthStore.getState();
    if (!token || !user) return;
    // Optimistic: aggiorna lo store subito così il prossimo render skippa autoplay
    useAuthStore.setState({ user: { ...user, onboarding_completed: true } });
    try {
      const updated = await patchOnboarding(token, true);
      useAuthStore.setState({ user: updated });
    } catch {
      // Network error → flag resta optimistic. Al prossimo /me bootstrap il
      // backend confermerà o resetterà (se il PATCH non era persistito).
    }
  }, []);
}

/**
 * Reset onboarding flag a `false` per replay dal menu Help. Diversamente da
 * `markComplete`, qui NON facciamo optimistic update perché vogliamo aspettare
 * la conferma server prima di ri-aprire il tour (evita race condition di
 * apertura tour senza che il backend lo registri).
 */
export function useResetOnboarding(): () => Promise<void> {
  return useCallback(async () => {
    const { token, user } = useAuthStore.getState();
    if (!token || !user) return;
    const updated = await patchOnboarding(token, false);
    useAuthStore.setState({ user: updated });
  }, []);
}

/**
 * Triggera l'avvio del tour via custom event. L'OnboardingTour ascolta
 * `feapro:tour:start` e si apre indipendentemente da onboarding_completed.
 */
export function startOnboardingTour(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("feapro:tour:start"));
}

// ── Internal helpers ────────────────────────────────────────────────────────

function toTourUser(u: AuthUser): User {
  return {
    id: u.id,
    email: u.email,
    onboarding_completed: u.onboarding_completed,
  };
}
