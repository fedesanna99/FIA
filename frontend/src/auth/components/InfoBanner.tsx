/**
 * InfoBanner · v2.7.0 Phase 4.1 mockup-driven (F.6)
 *
 * Notification banner inline con icon + testo + optional link/CTA.
 * Stile: bg-info + border accent translucido + 12px line-height 17.
 *
 * Usato sul forgot password state per spiegare il flow ("Non ricevi
 * l'email entro 5 minuti? Controlla lo spam, oppure contatta supporto"),
 * potenzialmente riutilizzabile su altri auth states o nel resto
 * dell'app sotto `.auth-shell` wrapper.
 *
 * Reference mockup: ui_kits/webapp_desktop/Auth.html righe 350-355.
 */
import type { ReactNode } from "react";
import { Info, type LucideIcon } from "lucide-react";

interface InfoBannerProps {
  /** Icona Lucide a sinistra del testo. Default: Info. */
  icon?: LucideIcon;
  /** Contenuto del banner (può contenere link, b, ecc.). */
  children: ReactNode;
  /** Override test-id. */
  testId?: string;
}

export function InfoBanner({ icon: Icon = Info, children, testId }: InfoBannerProps) {
  return (
    <div className="info-banner" data-testid={testId ?? "auth-info-banner"}>
      <Icon width={14} height={14} aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}
