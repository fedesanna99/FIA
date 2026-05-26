/**
 * OnboardingTour.test.tsx (v2.6.4 A.2).
 *
 * NB: jsdom non rende i target reali del tour (`.dashboard-hero`, ecc.).
 * Quando un target manca, il componente avanza automaticamente al next step
 * e infine chiama markComplete(). I test verificano:
 *   - Non render quando user è null/bootstrapping
 *   - Non render quando user.onboarding_completed=true
 *   - Autoplay innescato dopo ~800ms se onboarding_completed=false
 *   - markComplete (= patchOnboarding) chiamato al termine del flow
 *
 * Test visivi più dettagliati (spotlight clip-path, animation, scroll)
 * sono coperti via E2E live separato (axe + smoke).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, waitFor } from "@testing-library/react";

import { OnboardingTour } from "./OnboardingTour";
import { useAuthStore } from "../../store/authStore";
import * as authApi from "../../api/auth";

const patchSpy = vi.spyOn(authApi, "patchOnboarding");

beforeEach(() => {
  patchSpy.mockClear();
  patchSpy.mockResolvedValue({
    id: "u-test",
    email: "test@example.com",
    created_at: 0,
    last_login_at: null,
    onboarding_completed: true,
  });
  useAuthStore.setState({ token: "test-token", user: null, bootstrapping: false });
});

afterEach(() => {
  vi.useRealTimers();
});

function setUser(onboarding_completed: boolean) {
  useAuthStore.setState({
    token: "test-token",
    bootstrapping: false,
    user: {
      id: "u-test",
      email: "test@example.com",
      created_at: 0,
      last_login_at: null,
      onboarding_completed,
    },
  });
}

describe("OnboardingTour (v2.6.4 A.2)", () => {
  it("does NOT render when user is null", () => {
    useAuthStore.setState({ token: "", user: null, bootstrapping: false });
    const { container } = render(<OnboardingTour />);
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it("does NOT render when bootstrapping is true (auth not yet verified)", () => {
    useAuthStore.setState({ token: "", user: null, bootstrapping: true });
    const { container } = render(<OnboardingTour />);
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it("does NOT autoplay when user.onboarding_completed=true", async () => {
    vi.useFakeTimers();
    setUser(true);
    render(<OnboardingTour />);
    vi.advanceTimersByTime(2000);
    vi.useRealTimers();
    // markComplete NON deve essere chiamato spontaneamente
    expect(patchSpy).not.toHaveBeenCalled();
  });

  it("autoplays after ~800ms when onboarding_completed=false (target not found → auto-end + mark)", async () => {
    setUser(false);
    render(<OnboardingTour />);
    // In jsdom i target reali del DOM (`.dashboard-hero`, ecc.) non
    // esistono → OnboardingTour log warning + auto-advance fino al end
    // che chiama markComplete (patchOnboarding {completed:true}).
    // Verifichiamo che il flow autoplay arrivi al termine entro ~2s.
    await waitFor(
      () => {
        expect(patchSpy).toHaveBeenCalledWith("test-token", true);
      },
      { timeout: 3000 },
    );
  });

  it("startOnboardingTour event triggers the flow even if completed=true", async () => {
    setUser(true);
    render(<OnboardingTour />);
    expect(patchSpy).not.toHaveBeenCalled();
    // Dispatch event manualmente (simula click Help)
    window.dispatchEvent(new CustomEvent("feapro:tour:start"));
    // Stesso pattern: target non trovati → auto-end → markComplete
    await waitFor(
      () => {
        expect(patchSpy).toHaveBeenCalledWith("test-token", true);
      },
      { timeout: 3000 },
    );
  });
});
