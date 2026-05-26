/**
 * OnboardingTour · FEA Pro Precision v2.6.4
 *
 * Drop-in component. Mount once in App.tsx root.
 *
 *   <App>
 *     …
 *     <OnboardingTour />
 *   </App>
 *
 * AUTOPLAY: at first login (user.onboarding_completed === false) the tour
 * starts automatically after a short fade-in. Skipping marks it complete
 * server-side — no replay next session.
 *
 * REPLAY: dispatch CustomEvent("feapro:tour:start") from the Help menu
 * ("Rivedi tour onboarding"). The hook `useMarkOnboardingComplete()` is
 * called again only at end / skip; resetting `onboarding_completed = false`
 * is the backend's responsibility on the replay endpoint.
 *
 * STORAGE: backend user setting `user.onboarding_completed: boolean`.
 *   - GET /api/user/me  → must include `onboarding_completed`
 *   - PATCH /api/user/onboarding  body `{ completed: boolean }`
 *
 * Claude Code wires the real `useUser` + `useMarkOnboardingComplete` —
 * the stubs at the bottom of this file show the expected signatures.
 *
 * Spec: docs/c8-onboarding-tour-flow.md
 */

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

// Replace these two imports with the real implementations in your codebase:
//   import { useUser } from "@/lib/auth";
//   import { useMarkOnboardingComplete } from "@/lib/onboarding";
// Stubs (see bottom of file) keep this file standalone-buildable for review.
import { useUser, useMarkOnboardingComplete } from "./_onboarding-hooks.stub";

// ─── Types ──────────────────────────────────────────────────────────────

type Placement = "top" | "right" | "bottom" | "left";

type TourStep = {
  id: string;
  selector: string;
  title: string;
  body: string;
  placement?: Placement;
};

type TargetRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

// ─── Canonical 8-step tour ──────────────────────────────────────────────

const TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    selector: ".dashboard-hero",
    title: "Benvenuto in FEA Pro",
    body:
      "Un solver FEM con UX italiana. Backend production-grade, frontend onesto. Tracciabilità formule normative su ogni risultato. Niente black box.",
    placement: "bottom",
  },
  {
    id: "two-paths",
    selector: '.dashboard-card[data-path="studio-pro"]',
    title: "Due vie per costruire",
    body:
      "Studio Pro = controllo totale (modalità expert). Percorsi = guidato step-by-step. Puoi passare da uno all'altro in qualunque momento.",
    placement: "right",
  },
  {
    id: "ws-modello",
    selector: '.shell-rail [data-ws="modello"]',
    title: "Workspace Make",
    body:
      "Qui costruisci la struttura: nodi, elementi, materiali, sezioni. Tutto in italiano. Drag & drop file .dxf/.ifc/.json supportati.",
    placement: "right",
  },
  {
    id: "ws-analisi",
    selector: '.shell-rail [data-ws="analisi"]',
    title: "Workspace Solve",
    body:
      "Lancia statiche, modali, sismiche, non-lineari. Il solver lavora in cloud — ricevi notifica quando finisce, anche se chiudi il browser.",
    placement: "right",
  },
  {
    id: "ws-verifiche",
    selector: '.shell-rail [data-ws="verifiche"]',
    title: "Workspace Verifiche",
    body:
      "Verifiche normative EC2, EC3, EC8, NTC18 calcolate automaticamente. Ogni check è cliccabile con dettagli element-by-element + § norma.",
    placement: "right",
  },
  {
    id: "ws-risultati",
    selector: '.shell-rail [data-ws="risultati"]',
    title: "Workspace Risultati",
    body:
      "Diagrammi N/V/M, deformata, tensioni σ + UC. Navigabile per nodo o elemento. Trust Layer indica sempre lo stato del calcolo.",
    placement: "right",
  },
  {
    id: "export",
    selector: '[data-tools-card="export-server"]',
    title: "Esporta il report",
    body:
      "PDF reportlab, XLSX multi-sheet, DXF, IFC4. Pronto per consegna al committente o per allegato CILA/SCIA.",
    placement: "top",
  },
  {
    id: "palette",
    selector: ".shell-topbar .tb-search",
    title: "Command palette ⌘K",
    body:
      "Ctrl+K apre la palette. Cerca qualunque cosa per nome — azioni, modelli, norme. 144 voci indicizzate. Risparmia tempo, no menu hunting.",
    placement: "bottom",
  },
];

const CARD_W = 280;
const TARGET_PADDING = 8;
const CARD_GAP = 12;
const AUTOPLAY_DELAY_MS = 800; // small fade-in delay before autostart
const Z_BACKDROP = 50;
const Z_TARGET = 51;
const Z_CARD = 52;

// ─── Utils ──────────────────────────────────────────────────────────────

const isReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const isMobile = () =>
  typeof window !== "undefined" && window.innerWidth < 768;

const rectOf = (el: Element | null): TargetRect | null => {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
};

/** Try preferred placement; fall back through the others; clamp to viewport. */
function pickPlacement(
  target: TargetRect,
  preferred: Placement,
  cardW: number,
  cardH: number,
): { placement: Placement; top: number; left: number } | null {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const order: Placement[] = [
    preferred,
    ...(["bottom", "top", "right", "left"] as Placement[]).filter(
      (p) => p !== preferred,
    ),
  ];

  for (const p of order) {
    let top = 0;
    let left = 0;
    if (p === "bottom") {
      top = target.top + target.height + CARD_GAP;
      left = target.left + target.width / 2 - cardW / 2;
    } else if (p === "top") {
      top = target.top - cardH - CARD_GAP;
      left = target.left + target.width / 2 - cardW / 2;
    } else if (p === "right") {
      top = target.top + target.height / 2 - cardH / 2;
      left = target.left + target.width + CARD_GAP;
    } else {
      top = target.top + target.height / 2 - cardH / 2;
      left = target.left - cardW - CARD_GAP;
    }

    const clampedLeft = Math.max(12, Math.min(left, vw - cardW - 12));
    const clampedTop = Math.max(12, Math.min(top, vh - cardH - 12));

    const fits =
      clampedTop >= 0 &&
      clampedLeft >= 0 &&
      clampedTop + cardH <= vh &&
      clampedLeft + cardW <= vw;

    if (fits) return { placement: p, top: clampedTop, left: clampedLeft };
  }

  return null; // → center-screen fallback
}

/** Scroll the target into view if it's outside the viewport. */
function ensureInView(el: Element) {
  const r = el.getBoundingClientRect();
  const vh = window.innerHeight;
  const vw = window.innerWidth;
  const outOfView =
    r.top < 80 || r.bottom > vh - 80 || r.left < 0 || r.right > vw;
  if (!outOfView) return;

  // Manual smooth scroll — avoid scrollIntoView() per project rule.
  const targetY = window.scrollY + r.top - vh / 2 + r.height / 2;
  window.scrollTo({
    top: Math.max(0, targetY),
    behavior: isReducedMotion() ? "auto" : "smooth",
  });
}

// ─── Component ──────────────────────────────────────────────────────────

export function OnboardingTour() {
  const { user, isLoading } = useUser();
  const markComplete = useMarkOnboardingComplete();

  const [active, setActive] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const liveRegion = useRef<HTMLDivElement | null>(null);
  const hasAutoplayed = useRef(false);

  const step = TOUR_STEPS[stepIdx];
  const isLast = stepIdx === TOUR_STEPS.length - 1;
  const isFirst = stepIdx === 0;
  const mobile = isMobile();

  // ─── Start / stop ──────────────────────────────────────────────────

  const start = useCallback(() => {
    previousFocus.current = document.activeElement as HTMLElement | null;
    setStepIdx(0);
    setActive(true);
  }, []);

  const end = useCallback(() => {
    // Persist server-side. Fire-and-forget — we don't block UI on response.
    void markComplete().catch((err) => {
      // eslint-disable-next-line no-console
      console.warn("[OnboardingTour] markComplete failed", err);
    });
    setActive(false);
    setTargetRect(null);
    previousFocus.current?.focus?.();
  }, [markComplete]);

  // Listen for external start event (replay from Help menu)
  useEffect(() => {
    const onStart = () => start();
    window.addEventListener("feapro:tour:start", onStart);

    // Debug / demo URL flag
    if (
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("tour") === "1"
    ) {
      start();
    }
    return () => window.removeEventListener("feapro:tour:start", onStart);
  }, [start]);

  // AUTOPLAY for new users
  useEffect(() => {
    if (isLoading || !user) return;
    if (user.onboarding_completed) return;
    if (hasAutoplayed.current) return;
    hasAutoplayed.current = true;
    const t = setTimeout(start, AUTOPLAY_DELAY_MS);
    return () => clearTimeout(t);
  }, [isLoading, user, start]);

  // ─── Target measurement ────────────────────────────────────────────

  const measureTarget = useCallback(() => {
    if (!step) return;
    const el = document.querySelector(step.selector);
    if (!el) {
      // eslint-disable-next-line no-console
      console.warn(`[OnboardingTour] Target not found: ${step.selector}`);
      if (isLast) end();
      else setStepIdx((i) => i + 1);
      return;
    }
    ensureInView(el);
    // Re-read rect after scroll settles
    setTimeout(() => setTargetRect(rectOf(el)), isReducedMotion() ? 0 : 320);

    document
      .querySelectorAll('[data-tour-target="active"]')
      .forEach((n) => n.removeAttribute("data-tour-target"));
    el.setAttribute("data-tour-target", "active");
  }, [step, isLast, end]);

  useLayoutEffect(() => {
    if (!active) return;
    setTransitioning(true);
    measureTarget();
    const t = setTimeout(() => setTransitioning(false), 360);
    return () => clearTimeout(t);
  }, [active, stepIdx, measureTarget]);

  // Recompute on resize / scroll (debounced)
  useEffect(() => {
    if (!active) return;
    let t: ReturnType<typeof setTimeout>;
    const onChange = () => {
      clearTimeout(t);
      t = setTimeout(() => {
        const el = document.querySelector(step.selector);
        if (el) setTargetRect(rectOf(el));
      }, 100);
    };
    window.addEventListener("resize", onChange);
    window.addEventListener("scroll", onChange, true);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", onChange);
      window.removeEventListener("scroll", onChange, true);
    };
  }, [active, step]);

  // Cleanup data-tour-target attr on end
  useEffect(() => {
    if (active) return;
    document
      .querySelectorAll('[data-tour-target="active"]')
      .forEach((n) => n.removeAttribute("data-tour-target"));
  }, [active]);

  // ─── Keyboard ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        end();
      } else if (e.key === "ArrowRight" || e.key === "Enter") {
        e.preventDefault();
        if (isLast) end();
        else setStepIdx((i) => Math.min(i + 1, TOUR_STEPS.length - 1));
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setStepIdx((i) => Math.max(i - 1, 0));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, isLast, end]);

  // Announce step change to screen readers
  useEffect(() => {
    if (!active || !step || !liveRegion.current) return;
    liveRegion.current.textContent = `Step ${stepIdx + 1} di ${TOUR_STEPS.length}. ${step.title}. ${step.body}`;
  }, [active, stepIdx, step]);

  // Focus the primary action on step change
  useEffect(() => {
    if (!active) return;
    const t = setTimeout(() => {
      const btn = cardRef.current?.querySelector<HTMLButtonElement>(
        '[data-tour-action="next"]',
      );
      btn?.focus();
    }, 50);
    return () => clearTimeout(t);
  }, [active, stepIdx]);

  // ─── Positioning ───────────────────────────────────────────────────

  const positioning = useMemo(() => {
    if (!targetRect || mobile) return null;
    const estimatedH = 200;
    return pickPlacement(
      targetRect,
      step?.placement ?? "bottom",
      CARD_W,
      estimatedH,
    );
  }, [targetRect, step, mobile]);

  // ─── Render ────────────────────────────────────────────────────────

  if (!active || !step) return null;

  const portalRoot =
    typeof document !== "undefined" ? document.body : null;
  if (!portalRoot) return null;

  // SVG cut-out path: full viewport rect minus the target rect (with padding).
  // During transitioning the cutout is briefly hidden — backdrop fully opaque
  // → less jarring repositioning between steps.
  const showCutout = !!targetRect && !mobile && !transitioning;
  const cutout = showCutout
    ? `M0,0 H${window.innerWidth} V${window.innerHeight} H0 Z
       M${targetRect.left - TARGET_PADDING},${targetRect.top - TARGET_PADDING}
       h${targetRect.width + TARGET_PADDING * 2}
       v${targetRect.height + TARGET_PADDING * 2}
       h${-(targetRect.width + TARGET_PADDING * 2)} Z`
    : `M0,0 H${typeof window !== "undefined" ? window.innerWidth : 0} V${typeof window !== "undefined" ? window.innerHeight : 0} H0 Z`;

  return createPortal(
    <div
      className="feapro-tour"
      role="dialog"
      aria-modal="true"
      aria-labelledby="feapro-tour-title"
      data-transitioning={transitioning ? "true" : "false"}
    >
      <svg
        className="feapro-tour__backdrop"
        width="100%"
        height="100%"
        aria-hidden="true"
        onClick={end}
      >
        <path d={cutout} fillRule="evenodd" />
      </svg>

      <div
        ref={cardRef}
        className={`feapro-tour__card feapro-tour__card--${mobile ? "sheet" : positioning?.placement ?? "center"}`}
        style={
          mobile || !positioning
            ? undefined
            : { top: positioning.top, left: positioning.left }
        }
        onClick={(e) => e.stopPropagation()}
      >
        <header className="feapro-tour__head">
          <span className="feapro-tour__eyebrow">
            STEP {stepIdx + 1}/{TOUR_STEPS.length}
          </span>
          <button
            type="button"
            className="feapro-tour__close"
            aria-label="Chiudi tour"
            onClick={end}
          >
            ×
          </button>
        </header>

        <h2 id="feapro-tour-title" className="feapro-tour__title">
          {step.title}
        </h2>
        <p className="feapro-tour__body">{step.body}</p>

        <div className="feapro-tour__dots" aria-hidden="true">
          {TOUR_STEPS.map((s, i) => (
            <span
              key={s.id}
              className={`feapro-tour__dot ${i === stepIdx ? "is-active" : ""}`}
            />
          ))}
        </div>

        <footer className="feapro-tour__actions">
          <button
            type="button"
            className="feapro-tour__btn feapro-tour__btn--ghost"
            onClick={end}
          >
            Salta
          </button>
          <div className="feapro-tour__nav">
            <button
              type="button"
              className="feapro-tour__btn feapro-tour__btn--ghost"
              disabled={isFirst}
              onClick={() => setStepIdx((i) => Math.max(i - 1, 0))}
            >
              ← Indietro
            </button>
            <button
              type="button"
              className="feapro-tour__btn feapro-tour__btn--primary"
              data-tour-action="next"
              onClick={() => {
                if (isLast) end();
                else setStepIdx((i) => i + 1);
              }}
            >
              {isLast ? "Fine" : "Avanti →"}
            </button>
          </div>
        </footer>
      </div>

      <div
        ref={liveRegion}
        className="feapro-tour__sr"
        role="status"
        aria-live="polite"
      />

      <style>{`
        .feapro-tour {
          position: fixed;
          inset: 0;
          z-index: ${Z_BACKDROP};
          pointer-events: none;
        }
        .feapro-tour__backdrop {
          position: fixed;
          inset: 0;
          fill: rgba(0, 0, 0, 0.60);
          pointer-events: auto;
          transition: fill 200ms ease;
          ${isReducedMotion() ? "" : "animation: feapro-tour-fade 200ms ease;"}
        }
        @keyframes feapro-tour-fade {
          from { opacity: 0; }
          to   { opacity: 1; }
        }

        /* Target outline pulse — fades during transitions for smoother step change */
        [data-tour-target="active"] {
          position: relative;
          z-index: ${Z_TARGET};
          outline: 2px solid var(--accent, #0891B2);
          outline-offset: 2px;
          transition: outline-color 200ms ease;
          ${isReducedMotion() ? "" : "animation: feapro-tour-pulse 1.6s ease-in-out infinite;"}
        }
        .feapro-tour[data-transitioning="true"] ~ [data-tour-target="active"],
        [data-transitioning="true"] [data-tour-target="active"] {
          outline-color: transparent;
          animation: none;
        }
        @keyframes feapro-tour-pulse {
          0%, 100% { outline-color: var(--accent, #0891B2); }
          50%      { outline-color: var(--accent-hover, #0E7490); }
        }

        .feapro-tour__card {
          position: fixed;
          width: ${CARD_W}px;
          background: var(--bg-elevated, #FFFFFF);
          border: 1px solid var(--border-strong, #A8ACB3);
          padding: 16px 20px;
          z-index: ${Z_CARD};
          pointer-events: auto;
          font-family: var(--font-body, Inter, system-ui, sans-serif);
          color: var(--ink, #15161A);
          transition: top 240ms cubic-bezier(0.2, 0, 0, 1),
                      left 240ms cubic-bezier(0.2, 0, 0, 1);
          ${isReducedMotion() ? "" : "animation: feapro-tour-slideup 240ms cubic-bezier(0.2, 0, 0, 1);"}
        }
        @keyframes feapro-tour-slideup {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .feapro-tour__card--sheet {
          left: 0;
          right: 0;
          bottom: 0;
          top: auto;
          width: 100%;
          border-left: 0;
          border-right: 0;
          border-bottom: 0;
        }

        .feapro-tour__head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }
        .feapro-tour__eyebrow {
          font-family: var(--font-mono, "JetBrains Mono", ui-monospace, monospace);
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--ink-dim, #7B808A);
        }
        .feapro-tour__close {
          background: transparent;
          border: 0;
          font-size: 18px;
          line-height: 1;
          color: var(--ink-muted, #4A4F57);
          cursor: pointer;
          padding: 4px 6px;
        }
        .feapro-tour__close:hover { color: var(--ink, #15161A); }
        .feapro-tour__close:focus-visible {
          outline: 2px solid var(--accent, #0891B2);
          outline-offset: 1px;
        }

        .feapro-tour__title {
          font-family: var(--font-display, "Inter Tight", Inter, sans-serif);
          font-size: 18px;
          font-weight: 600;
          letter-spacing: -0.015em;
          line-height: 1.25;
          margin: 0 0 8px 0;
        }
        .feapro-tour__body {
          font-size: 13px;
          line-height: 1.5;
          color: var(--ink-muted, #4A4F57);
          margin: 0 0 16px 0;
          text-wrap: pretty;
        }

        .feapro-tour__dots {
          display: flex;
          gap: 6px;
          margin-bottom: 16px;
        }
        .feapro-tour__dot {
          width: 6px;
          height: 6px;
          border-radius: 9999px;
          border: 1px solid var(--ink-faint, #B0B5BD);
          background: transparent;
        }
        .feapro-tour__dot.is-active {
          background: var(--accent, #0891B2);
          border-color: var(--accent, #0891B2);
        }

        .feapro-tour__actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }
        .feapro-tour__nav { display: flex; gap: 6px; }
        .feapro-tour__btn {
          font-family: inherit;
          font-size: 12px;
          font-weight: 500;
          height: 28px;
          padding: 0 12px;
          border-radius: 0;
          border: 1px solid transparent;
          cursor: pointer;
          transition: background-color 120ms, border-color 120ms, color 120ms;
        }
        .feapro-tour__btn:focus-visible {
          outline: 2px solid var(--accent, #0891B2);
          outline-offset: 1px;
        }
        .feapro-tour__btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .feapro-tour__btn--ghost {
          background: transparent;
          color: var(--ink-muted, #4A4F57);
        }
        .feapro-tour__btn--ghost:hover:not(:disabled) {
          background: var(--bg-hover, #F4F5F7);
          color: var(--ink, #15161A);
        }
        .feapro-tour__btn--primary {
          background: var(--accent, #0891B2);
          color: #FFFFFF;
          border-color: var(--accent, #0891B2);
        }
        .feapro-tour__btn--primary:hover:not(:disabled) {
          background: var(--accent-hover, #0E7490);
          border-color: var(--accent-hover, #0E7490);
        }
        .feapro-tour__btn--primary:active:not(:disabled) {
          background: var(--accent-active, #155E75);
          border-color: var(--accent-active, #155E75);
        }

        .feapro-tour__sr {
          position: absolute;
          width: 1px; height: 1px; padding: 0; margin: -1px;
          overflow: hidden; clip: rect(0, 0, 0, 0);
          white-space: nowrap; border: 0;
        }

        @media (prefers-reduced-motion: reduce) {
          .feapro-tour__backdrop,
          .feapro-tour__card,
          [data-tour-target="active"] {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>
    </div>,
    portalRoot,
  );
}

// ─── Public helpers ─────────────────────────────────────────────────────

/**
 * Replay trigger from the Help menu.
 *
 *   import { startOnboardingTour } from "@/components/shell/OnboardingTour";
 *   <MenuItem onClick={startOnboardingTour}>Rivedi tour onboarding</MenuItem>
 *
 * Note: the Help menu handler is also expected to call the backend to reset
 * `onboarding_completed = false` BEFORE dispatching this — otherwise the
 * tour ends-of-step marks it complete again immediately, which is fine for
 * the current session but the user would not see autoplay on next login
 * unless they had reset the flag (likely already the case post-completion).
 */
export function startOnboardingTour() {
  window.dispatchEvent(new CustomEvent("feapro:tour:start"));
}

export default OnboardingTour;
