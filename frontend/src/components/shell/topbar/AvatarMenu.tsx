/**
 * AvatarMenu (alpha.30) — cluster utente in topbar, mockup v1.3.
 *
 * Wrap dell'avatar utente con un Radix DropdownMenu: cliccando l'avatar
 * si apre un menu compatto con:
 *  - email + label "Connesso come"
 *  - Account & quota → apre AccountDialog (event feapro:open-account)
 *  - Loads location → apre LocationPickerDialog (event feapro:open-location)
 *  - Tema (cycle dark/light/system)
 *  - Logout
 *
 * Anonimo → mostra solo bottone "Accedi" (apre AuthDialog).
 *
 * Sostituisce i bottoni isolati Loads/Account/Logout precedenti in TopBar,
 * concentrando tutte le azioni utente in un unico entry point.
 */
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { User, MapPin, LogOut, LogIn, Sun, Moon, Monitor } from "lucide-react";
import { useAuthStore } from "../../../store/authStore";
import { useThemeStore } from "../../../store/themeStore";
import { toast } from "../../../store/toastStore";
import { Button } from "../../ui/Button";
import { Tooltip } from "../../ui/Tooltip";
import { CollabAvatars } from "./CollabAvatars";

const THEME_ICON = { light: Moon, dark: Monitor, system: Sun } as const;
const THEME_LABEL = { light: "Light", dark: "Dark", system: "System" } as const;

export function AvatarMenu() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const themeMode = useThemeStore((s) => s.mode);
  const cycleTheme = useThemeStore((s) => s.cycle);

  // Anonimo: bottone Accedi singolo (apre AuthDialog via event)
  if (!user) {
    return (
      <Tooltip content="Accedi o crea un account">
        <Button
          size="sm"
          variant="ghost"
          iconLeft={<LogIn className="h-3.5 w-3.5" />}
          onClick={() => window.dispatchEvent(new Event("feapro:open-auth"))}
          data-testid="topbar-login"
        >
          <span className="hidden md:inline">Accedi</span>
        </Button>
      </Tooltip>
    );
  }

  const ThemeIcon = THEME_ICON[themeMode];

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-1 focus-visible:ring-offset-bg-panel flex-shrink-0"
          aria-label="Menu utente"
          data-testid="topbar-avatar-menu"
        >
          <CollabAvatars />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="min-w-[220px] bg-bg-panel border border-border rounded-md shadow-pop z-50 overflow-hidden animate-fade-in"
        >
          <div className="px-3 py-2 border-b border-border">
            <div className="text-[11px] text-ink-muted">Connesso come</div>
            <div className="font-semibold text-sm truncate">{user.email}</div>
          </div>
          <div className="py-1">
            <DropdownMenu.Item
              onSelect={() => window.dispatchEvent(new Event("feapro:open-account"))}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-ink hover:bg-bg-hover focus:bg-bg-hover focus:outline-none cursor-pointer"
            >
              <User className="w-3.5 h-3.5 text-ink-muted" />
              Account &amp; quota
            </DropdownMenu.Item>
            <DropdownMenu.Item
              onSelect={() => window.dispatchEvent(new Event("feapro:open-location"))}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-ink hover:bg-bg-hover focus:bg-bg-hover focus:outline-none cursor-pointer"
            >
              <MapPin className="w-3.5 h-3.5 text-ink-muted" />
              Loads location
            </DropdownMenu.Item>
            <DropdownMenu.Item
              onSelect={(e) => { e.preventDefault(); cycleTheme(); }}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-ink hover:bg-bg-hover focus:bg-bg-hover focus:outline-none cursor-pointer"
            >
              <ThemeIcon className="w-3.5 h-3.5 text-ink-muted" />
              Tema: <span className="font-mono text-[11px] text-ink-muted ml-auto">{THEME_LABEL[themeMode]}</span>
            </DropdownMenu.Item>
          </div>
          <DropdownMenu.Separator className="h-px bg-border" />
          <div className="py-1">
            <DropdownMenu.Item
              onSelect={() => {
                logout();
                toast("info", "Disconnesso.");
              }}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-danger hover:bg-bg-hover focus:bg-bg-hover focus:outline-none cursor-pointer"
              data-testid="topbar-logout"
            >
              <LogOut className="w-3.5 h-3.5" />
              Logout
            </DropdownMenu.Item>
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
