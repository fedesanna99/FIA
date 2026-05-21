/**
 * themeStore.test.ts — copre il theme switching dark/light/system (alpha.16).
 *
 * Punto chiave: il default e' "system" (cambiato in alpha.16) e segue
 * `prefers-color-scheme`. I test mockano `matchMedia` per controllare il
 * branching.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

import { useThemeStore } from "./themeStore";


function mockMatchMedia(prefersLight: boolean) {
  const listeners: Array<(e: { matches: boolean }) => void> = [];
  const mq = {
    matches: prefersLight,
    media: "(prefers-color-scheme: light)",
    addEventListener: (_: string, fn: (e: { matches: boolean }) => void) => listeners.push(fn),
    removeEventListener: (_: string, fn: (e: { matches: boolean }) => void) => {
      const i = listeners.indexOf(fn);
      if (i >= 0) listeners.splice(i, 1);
    },
    dispatchEvent: () => true,
    onchange: null,
    // helper non-standard per i test
    _fire: (matches: boolean) => {
      mq.matches = matches;
      listeners.forEach((l) => l({ matches }));
    },
  };
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: vi.fn().mockReturnValue(mq),
  });
  return mq;
}


beforeEach(() => {
  // Pulisci localStorage e DOM tra i test
  window.localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.style.colorScheme = "";
  // Reset store state (zustand persist re-hydrate al primo accesso)
  useThemeStore.setState({ mode: "system", resolved: "dark" });
});


describe("themeStore", () => {
  it("default mode is 'system' (changed in alpha.16)", () => {
    const s = useThemeStore.getState();
    expect(s.mode).toBe("system");
  });

  it("setMode('dark') applies data-theme=dark on <html>", () => {
    useThemeStore.getState().setMode("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(useThemeStore.getState().resolved).toBe("dark");
  });

  it("setMode('light') applies data-theme=light on <html>", () => {
    useThemeStore.getState().setMode("light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(useThemeStore.getState().resolved).toBe("light");
  });

  it("setMode('system') resolves via prefers-color-scheme (dark)", () => {
    mockMatchMedia(false); // prefers-color-scheme: light → false → dark
    useThemeStore.getState().setMode("system");
    expect(useThemeStore.getState().mode).toBe("system");
    expect(useThemeStore.getState().resolved).toBe("dark");
  });

  it("setMode('system') resolves via prefers-color-scheme (light)", () => {
    mockMatchMedia(true); // prefers-color-scheme: light
    useThemeStore.getState().setMode("system");
    expect(useThemeStore.getState().resolved).toBe("light");
  });

  it("cycle: dark → light → system → dark", () => {
    mockMatchMedia(false);
    const s = useThemeStore.getState();
    s.setMode("dark");
    s.cycle();
    expect(useThemeStore.getState().mode).toBe("light");
    s.cycle();
    expect(useThemeStore.getState().mode).toBe("system");
    s.cycle();
    expect(useThemeStore.getState().mode).toBe("dark");
  });

  it("init() registers MQ listener and returns cleanup", () => {
    const mq = mockMatchMedia(false);
    useThemeStore.getState().setMode("system");
    const cleanup = useThemeStore.getState().init();
    // Simula cambio OS preference da dark a light
    mq._fire(true);
    expect(useThemeStore.getState().resolved).toBe("light");
    cleanup();
  });

  it("init() does NOT switch theme when mode is explicit (dark/light)", () => {
    const mq = mockMatchMedia(false);
    useThemeStore.getState().setMode("dark"); // esplicito
    const cleanup = useThemeStore.getState().init();
    // L'OS dice "preferisco light" ma noi siamo forzati su dark
    mq._fire(true);
    expect(useThemeStore.getState().mode).toBe("dark");
    expect(useThemeStore.getState().resolved).toBe("dark");
    cleanup();
  });
});
