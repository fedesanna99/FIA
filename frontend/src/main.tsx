import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import { AuthGate } from "./components/auth/AuthGate";
import { Toaster } from "./components/layout/Toaster";
import { TooltipProvider } from "./components/ui/Tooltip";
import { ErrorBoundary } from "./components/ui/ErrorBoundary";
import "./index.css";

if (typeof window !== "undefined") {
  window.addEventListener("error", (event) => {
    console.error("[global error]", event.error ?? event.message);
  });
  window.addEventListener("unhandledrejection", (event) => {
    console.error("[global unhandledrejection]", event.reason);
  });
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
