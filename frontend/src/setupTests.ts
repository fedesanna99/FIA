import "@testing-library/jest-dom/vitest";

// Polyfill ResizeObserver per jsdom (richiesto da recharts e altri).
// Senza questo, componenti che usano ResponsiveContainer crashano:
//   ReferenceError: ResizeObserver is not defined
// (errore non bloccante perche' avviene dopo che il test ha gia' superato
// gli expect, ma scrive "1 unhandled error" nel summary vitest).
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
if (typeof globalThis.ResizeObserver === "undefined") {
  (globalThis as { ResizeObserver?: typeof ResizeObserver }).ResizeObserver =
    ResizeObserverStub as unknown as typeof ResizeObserver;
}

// Polyfill Element.scrollIntoView per jsdom (richiesto da cmdk Command.Item).
// Senza questo, vi/jest crashano con "i.scrollIntoView is not a function"
// quando si monta CommandPalette nei test.
if (typeof window !== "undefined" && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = function () { /* noop */ };
}
