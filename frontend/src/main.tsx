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
import { Toaster } from "./components/layout/Toaster";
import { TooltipProvider } from "./components/ui/Tooltip";
import { ErrorBoundary } from "./components/ui/ErrorBoundary";
import { toastApiError } from "./lib/apiErrors";
import "./styles/tokens.css";
import "./index.css";
import "./styles/shell.css";

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
