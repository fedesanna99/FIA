import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import { AuthGate } from "./components/auth/AuthGate";
import { Toaster } from "./components/layout/Toaster";
import { TooltipProvider } from "./components/ui/Tooltip";
import { ErrorBoundary } from "./components/ui/ErrorBoundary";
import { toastApiError } from "./lib/apiErrors";
import "./index.css";

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
          {/* v2.1.4 auth-gate: AuthGate decide se mostrare AuthScreen (login
              obbligatorio) o l'App. Toaster fuori dal gate così i toast
              "Benvenuto …" sono visibili anche durante l'AuthScreen. */}
          <Toaster />
          <AuthGate>
            <App />
          </AuthGate>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
