/**
 * useIsMobile (v1.5 Task 30) — hook responsive detection.
 *
 * Usato dall'App shell per:
 *  - nascondere LeftRail/RightRail su mobile (< 768)
 *  - mostrare bottom tabbar
 *  - ridurre TopBar a essenziale
 *
 * NB: usa window.innerWidth + listener `resize`. Niente matchMedia per
 * compat con jsdom-preview (alcuni casi mockano matchMedia ma non
 * propagano resize). Default breakpoint 768 (Tailwind `md`).
 */
import { useEffect, useState } from "react";


export function useIsMobile(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window !== "undefined" ? window.innerWidth < breakpoint : false,
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const check = () => setIsMobile(window.innerWidth < breakpoint);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [breakpoint]);

  return isMobile;
}
