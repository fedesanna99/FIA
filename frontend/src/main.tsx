import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import App from "./App";
import { AuthGate } from "./components/auth/AuthGate";
import { AuthLayout } from "./auth/AuthLayout";
import { LoginPage } from "./auth/LoginPage";
import { SignupPage } from "./auth/SignupPage";
import { ForgotPasswordPage } from "./auth/ForgotPasswordPage";
import { EmailVerifyPage } from "./auth/EmailVerifyPage";
// v2.7.2 Phase 4.3 mockup-driven: Templates gallery full-page route.
import { TemplatesPage } from "./templates/TemplatesPage";
// v2.7.3 Phase 4.3b mockup-driven: Percorso UC1 stepper full-page route.
import { PercorsoUC1Page } from "./percorsi/PercorsoUC1Page";
// v2.7.4 Phase 5.1 mockup-driven: Studio Modello workspace full-page route.
import { StudioModelloPage } from "./studio/StudioModelloPage";
// v2.7.5 Phase 5.2 mockup-driven: Studio Analisi workspace full-page route.
import { StudioAnalisiPage } from "./studio/StudioAnalisiPage";
// v2.7.6 Phase 5.3 mockup-driven: Studio Verifiche workspace full-page route.
import { StudioVerifichePage } from "./studio/StudioVerifichePage";
// v2.7.7 Phase 5.4 mockup-driven: Studio IO workspace full-page route.
import { StudioIOPage } from "./studio/StudioIOPage";
// v2.8.0 Phase 6.1-6.3 mockup-driven: Dialogs showcase + Settings + States + Mobile.
import { DialogsShowcasePage } from "./dialogs/DialogsShowcasePage";
import { SettingsPage } from "./settings/SettingsPage";
// Fetta E3.8: pagina /settings/billing (mockup Claude Design Round 2,
// Handoff 05 §R2.2). Mostra 3 stati derivati da quota.tier + userModels.
import { SettingsBillingPage } from "./settings/SettingsBillingPage";
import { StatesShowcasePage } from "./states/StatesShowcasePage";
import { MobileShowcasePage } from "./mobile/MobileShowcasePage";
// v2.8.1 Sprint A M3: legal pages per compliance (privacy/terms/about/preliminary)
import { LegalPage } from "./legal/LegalPage";
import { Toaster } from "./components/layout/Toaster";
import { TooltipProvider } from "./components/ui/Tooltip";
import { ErrorBoundary } from "./components/ui/ErrorBoundary";
// v3.1.2 audit-fix L2-8 + L2-P0#1/#2: listener feapro:* globali fuori da
// App.tsx (montato solo su path="*"). Ora attivi cross-route.
import { GlobalRoutingListeners } from "./router/GlobalRoutingListeners";
import { toastApiError } from "./lib/apiErrors";
import "./styles/tokens.css";
import "./index.css";
import "./styles/shell.css";
// v3.1 Fase 1a: override estetico Shell custom topbar (TopBar mockup
// Studio v2). Cascade vince su shell.css (caricato prima). Reversibile.
import "./styles/shell-mockup-v3.css";

// v2.5.5 cluster B (S0 T2 follow-up): handler globali ora emettono toast
// italiani via translateApiError, oltre al console.error. Filtro per il
// rumore noto (ResizeObserver loop, chunk failed) — toast solo per errori
// che meritano attenzione utente.
function handleGlobalError(err: unknown): void {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  if (/ResizeObserver loop|Loading chunk \d+ failed/.test(msg)) {
    console.warn("[global error · suppressed]", msg);
    return;
  }
  console.error("[global error]", err);
  // Defer toast: lo store Zustand è già disponibile, ma il Toaster componente
  // potrebbe non essere ancora montato al primissimo errore di boot. Il push
  // entra comunque in `toasts[]` e verrà renderizzato appena Toaster monta.
  queueMicrotask(() => {
    try {
      toastApiError(err, "Errore imprevisto");
    } catch {
      // ignore: meglio silent che crash dentro l'error handler
    }
  });
}

if (typeof window !== "undefined") {
  window.addEventListener("error", (event) => handleGlobalError(event.error ?? event.message));
  window.addEventListener("unhandledrejection", (event) => handleGlobalError(event.reason));
}

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          {/* v2.7.0 Phase 4.1: BrowserRouter abilitato per le 4 route auth
              (/login /signup /forgot-password /verify-email) che montano
              AuthLayout split-screen. Il path "*" cattura tutto il resto
              e monta AuthGate→App (la webapp principale resta state-based
              come prima, NON router-aware). Toaster fuori dal router così
              i toast restano visibili anche su auth pages. */}
          <Toaster />
          <BrowserRouter>
            <GlobalRoutingListeners />
            <Routes>
              <Route element={<AuthLayout />}>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/verify-email" element={<EmailVerifyPage />} />
              </Route>
              {/* v2.7.2 Phase 4.3: Templates gallery full-page (no AuthLayout
                  wrapper, ma dentro AuthGate per richiedere login). */}
              <Route
                path="/templates"
                element={
                  <AuthGate>
                    <TemplatesPage />
                  </AuthGate>
                }
              />
              {/* v2.7.3 Phase 4.3b: Percorso UC1 stepper full-page (Topbar +
                  Stepper 6 step + Coach/Canvas/Inspector). Dentro AuthGate. */}
              <Route
                path="/percorsi/uc1"
                element={
                  <AuthGate>
                    <PercorsoUC1Page />
                  </AuthGate>
                }
              />
              {/* v2.7.4 Phase 5.1: Studio Modello workspace full-page (Studio
                  shell: TopBar + Rail + Tree + Viewport + Panel + StatusBar). */}
              <Route
                path="/studio/modello"
                element={
                  <AuthGate>
                    <StudioModelloPage />
                  </AuthGate>
                }
              />
              {/* v2.7.5 Phase 5.2: Studio Analisi workspace (solver catalog +
                  filter pills + params panel). No-tree layout 3-col. */}
              <Route
                path="/studio/analisi"
                element={
                  <AuthGate>
                    <StudioAnalisiPage />
                  </AuthGate>
                }
              />
              {/* v2.7.6 Phase 5.3: Studio Verifiche workspace (code tabs +
                  UR hero + gauge + UR table). No-tree layout 3-col. */}
              <Route
                path="/studio/verifiche"
                element={
                  <AuthGate>
                    <StudioVerifichePage />
                  </AuthGate>
                }
              />
              {/* v2.7.7 Phase 5.4: Studio IO workspace (dropzone + tool cards
                  Export/Compare/Auto-detect/AI + collab strip). No-tree 3-col. */}
              <Route
                path="/studio/io"
                element={
                  <AuthGate>
                    <StudioIOPage />
                  </AuthGate>
                }
              />
              {/* v2.8.0 Phase 6.1: Dialogs showcase (Node/Load/Mesh/NewModel). */}
              <Route
                path="/design/dialogs"
                element={
                  <AuthGate>
                    <DialogsShowcasePage />
                  </AuthGate>
                }
              />
              {/* v2.8.0 Phase 6.2: Settings page (Profilo/Avanzato/Sistema sections). */}
              <Route
                path="/settings"
                element={
                  <AuthGate>
                    <SettingsPage />
                  </AuthGate>
                }
              />
              {/* Fetta E3.8: Settings · Billing page (mockup Claude Design Round 2). */}
              <Route
                path="/settings/billing"
                element={
                  <AuthGate>
                    <SettingsBillingPage />
                  </AuthGate>
                }
              />
              {/* v2.8.0 Phase 6.2: States showcase (Empty/Solver/Error/404). */}
              <Route
                path="/design/states"
                element={
                  <AuthGate>
                    <StatesShowcasePage />
                  </AuthGate>
                }
              />
              {/* v2.8.0 Phase 6.3: Mobile redesign showcase (Viewer/Results/Home). */}
              <Route
                path="/design/mobile"
                element={
                  <AuthGate>
                    <MobileShowcasePage />
                  </AuthGate>
                }
              />
              {/* v2.8.1 Sprint A M3: legal pages (privacy/terms/about/preliminary).
                  NON dentro AuthGate — devono essere accessibili anche a logout
                  per compliance GDPR + per i link footer dei mockup. */}
              <Route path="/privacy" element={<LegalPage />} />
              <Route path="/terms" element={<LegalPage />} />
              <Route path="/about" element={<LegalPage />} />
              <Route path="/preliminary" element={<LegalPage />} />
              <Route
                path="*"
                element={
                  <AuthGate>
                    <App />
                  </AuthGate>
                }
              />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
