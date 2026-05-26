/**
 * Expected hook signatures for OnboardingTour wiring.
 *
 * This stub file is REFERENCE ONLY — Claude Code should replace these
 * imports in OnboardingTour.tsx with the real production hooks:
 *
 *   import { useUser } from "@/lib/auth";
 *   import { useMarkOnboardingComplete } from "@/lib/onboarding";
 *
 * Backend contract:
 *   - GET  /api/user/me        → User (must include `onboarding_completed`)
 *   - PATCH /api/user/onboarding  body { completed: boolean }  → User
 *
 * Replay flow (Help menu → "Rivedi tour onboarding"):
 *   1. Call PATCH /api/user/onboarding { completed: false }
 *   2. Refresh useUser() cache (SWR mutate / TanStack invalidate)
 *   3. Dispatch startOnboardingTour() to open the tour immediately
 */

export type User = {
  id: string;
  email: string;
  onboarding_completed: boolean;
  // ...altri campi user
};

export type UseUserReturn = {
  user: User | null;
  isLoading: boolean;
  error?: Error;
};

/** Real impl should subscribe to auth store and revalidate on mount. */
export function useUser(): UseUserReturn {
  // Stub — returns a user that has NOT completed onboarding so the tour
  // autoplays in dev. Replace in production.
  return {
    user: {
      id: "stub",
      email: "stub@feapro.local",
      onboarding_completed: false,
    },
    isLoading: false,
  };
}

/**
 * Marks the current user's onboarding as completed.
 * Implementation should:
 *   - PATCH /api/user/onboarding { completed: true }
 *   - Optimistically update the local useUser() cache
 *   - Return the promise so callers can chain or await
 */
export function useMarkOnboardingComplete(): () => Promise<void> {
  return async () => {
    // Stub — real impl posts to backend.
    // eslint-disable-next-line no-console
    console.info("[stub] markOnboardingComplete() called");
  };
}
