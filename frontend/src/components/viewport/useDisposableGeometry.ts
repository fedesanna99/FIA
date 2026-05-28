/**
 * useDisposableGeometry · v3.3.0 audit-fix L3.3-P0-1
 *
 * Hook che gestisce automaticamente il dispose() di geometry/material Three.js
 * quando le dependency cambiano o il componente smonta.
 *
 * Prima il viewport aveva ZERO chiamate `.dispose()` in tutto il codice
 * (`grep dispose() src/components/viewport/` ritornava 0). Su sessione lunga
 * (open/close model, run analisi, switch render mode, theme switch) le risorse
 * GPU si accumulavano causando OOM WebGL crash dopo ~30 min.
 *
 * Uso:
 *
 *   const geometry = useDisposableGeometry(() => {
 *     const g = new THREE.BufferGeometry();
 *     g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
 *     return g;
 *   }, [positions]);
 *
 * Quando `positions` cambia, la vecchia geometry viene dispose-ata prima di
 * crearne una nuova. Quando il componente smonta, dispose finale.
 */
import { useEffect, useMemo, useRef } from "react";

type Disposable = { dispose: () => void };

export function useDisposableGeometry<T extends Disposable>(
  factory: () => T,
  deps: React.DependencyList,
): T {
  // useMemo crea la nuova istanza; ref tiene quella precedente per dispose.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const value = useMemo(factory, deps);
  const prevRef = useRef<T | null>(null);

  // Quando `value` cambia (dep changed), dispose della vecchia.
  useEffect(() => {
    const prev = prevRef.current;
    prevRef.current = value;
    if (prev && prev !== value) {
      prev.dispose();
    }
  }, [value]);

  // Cleanup finale all'unmount: dispose dell'ultima istanza.
  useEffect(() => {
    return () => {
      if (prevRef.current) {
        prevRef.current.dispose();
        prevRef.current = null;
      }
    };
  }, []);

  return value;
}

/**
 * Variante per array di disposables (es. N geometry per N elementi).
 */
export function useDisposableArray<T extends Disposable>(
  factory: () => T[],
  deps: React.DependencyList,
): T[] {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const values = useMemo(factory, deps);
  const prevRef = useRef<T[] | null>(null);

  useEffect(() => {
    const prev = prevRef.current;
    prevRef.current = values;
    if (prev && prev !== values) {
      for (const item of prev) item.dispose();
    }
  }, [values]);

  useEffect(() => {
    return () => {
      if (prevRef.current) {
        for (const item of prevRef.current) item.dispose();
        prevRef.current = null;
      }
    };
  }, []);

  return values;
}
