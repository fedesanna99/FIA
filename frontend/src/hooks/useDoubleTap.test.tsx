// v3.4 Fetta M5 mobile (30/05/2026) — useDoubleTap hook tests.
//
// Verifica:
//   - single tap entro 300ms: NO trigger
//   - double tap entro 300ms: trigger
//   - tap → wait > 300ms → tap: NO trigger (reset)
//   - tre tap consecutivi: trigger 1 volta (al 2°), poi reset
//   - enabled=false: NO trigger anche con doppio tap
//   - click su elemento interattivo (button/a/input): skip, no trigger
//   - cleanup timer non causa side effect dopo unmount

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent, act } from "@testing-library/react";
import { useDoubleTap } from "./useDoubleTap";


function TestHost({ onDoubleTap, enabled = true }: {
  onDoubleTap: () => void;
  enabled?: boolean;
}) {
  const { onClick } = useDoubleTap(onDoubleTap, enabled);
  return (
    <section data-testid="tap-area" onClick={onClick}>
      <button data-testid="inner-button">btn</button>
      <div data-testid="inner-div">content</div>
    </section>
  );
}


describe("useDoubleTap", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("single tap NON triggera onDoubleTap", () => {
    const spy = vi.fn();
    const { getByTestId } = render(<TestHost onDoubleTap={spy} />);
    fireEvent.click(getByTestId("tap-area"));
    expect(spy).not.toHaveBeenCalled();
  });

  it("double tap entro 300ms triggera onDoubleTap (1 volta)", () => {
    const spy = vi.fn();
    const { getByTestId } = render(<TestHost onDoubleTap={spy} />);
    const area = getByTestId("tap-area");
    fireEvent.click(area);
    // Avanza il tempo di solo 100ms (dentro la finestra)
    act(() => { vi.advanceTimersByTime(100); });
    fireEvent.click(area);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("tap + wait > 300ms + tap: NO trigger (timer reset)", () => {
    const spy = vi.fn();
    const { getByTestId } = render(<TestHost onDoubleTap={spy} />);
    const area = getByTestId("tap-area");
    fireEvent.click(area);
    act(() => { vi.advanceTimersByTime(400); });
    fireEvent.click(area);
    expect(spy).not.toHaveBeenCalled();
  });

  it("tre tap consecutivi: trigger al 2°, il 3° riinizia conta", () => {
    const spy = vi.fn();
    const { getByTestId } = render(<TestHost onDoubleTap={spy} />);
    const area = getByTestId("tap-area");
    fireEvent.click(area);
    act(() => { vi.advanceTimersByTime(50); });
    fireEvent.click(area);
    expect(spy).toHaveBeenCalledTimes(1);
    // Il 3° tap inizia una nuova finestra (solo)
    act(() => { vi.advanceTimersByTime(50); });
    fireEvent.click(area);
    expect(spy).toHaveBeenCalledTimes(1);
    // Il 4° tap entro 300ms dal 3° → trigger 2
    act(() => { vi.advanceTimersByTime(50); });
    fireEvent.click(area);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("enabled=false: NO trigger anche con doppio tap", () => {
    const spy = vi.fn();
    const { getByTestId } = render(<TestHost onDoubleTap={spy} enabled={false} />);
    const area = getByTestId("tap-area");
    fireEvent.click(area);
    act(() => { vi.advanceTimersByTime(100); });
    fireEvent.click(area);
    expect(spy).not.toHaveBeenCalled();
  });

  it("click su <button> interno: skip, NON triggera (no counter increment)", () => {
    const spy = vi.fn();
    const { getByTestId } = render(<TestHost onDoubleTap={spy} />);
    const area = getByTestId("tap-area");
    const button = getByTestId("inner-button");
    // Doppio click sul button NON deve triggerare (button è interactive)
    fireEvent.click(button);
    act(() => { vi.advanceTimersByTime(100); });
    fireEvent.click(button);
    expect(spy).not.toHaveBeenCalled();
    // E nemmeno se uno sul button + uno sull'area (counter non incrementato dal button)
    fireEvent.click(button);
    act(() => { vi.advanceTimersByTime(50); });
    fireEvent.click(area);
    expect(spy).not.toHaveBeenCalled();
  });

  it("doppio tap su area (non button): trigger correttamente", () => {
    const spy = vi.fn();
    const { getByTestId } = render(<TestHost onDoubleTap={spy} />);
    const div = getByTestId("inner-div");
    fireEvent.click(div);
    act(() => { vi.advanceTimersByTime(80); });
    fireEvent.click(div);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("cleanup: unmount durante finestra non causa errore", () => {
    const spy = vi.fn();
    const { getByTestId, unmount } = render(<TestHost onDoubleTap={spy} />);
    fireEvent.click(getByTestId("tap-area"));
    unmount();
    // Avanza timer post-unmount → non deve throw
    act(() => { vi.advanceTimersByTime(500); });
    expect(spy).not.toHaveBeenCalled();
  });
});
