import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("[ErrorBoundary]", error, info);
  }

  handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            padding: "2rem",
            textAlign: "center",
            fontFamily: "var(--font-body, system-ui), sans-serif",
            color: "var(--ink, #1a1a1a)",
            background: "var(--bg, #fafafa)",
            gap: "1rem",
          }}
        >
          <h1 style={{ fontSize: "1.5rem", margin: 0 }}>
            Si è verificato un errore imprevisto.
          </h1>
          <p style={{ margin: 0, color: "var(--ink-dim, #666)", maxWidth: "32rem" }}>
            L'applicazione non è riuscita a continuare. Puoi ricaricare la pagina per
            riprendere. Se l'errore si ripresenta, segnalalo allo sviluppatore con
            la descrizione di cosa stavi facendo.
          </p>
          <button
            onClick={this.handleReload}
            style={{
              padding: "0.5rem 1.25rem",
              fontSize: "0.95rem",
              border: "1px solid var(--ink, #1a1a1a)",
              background: "var(--bg, #fff)",
              color: "var(--ink, #1a1a1a)",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Ricarica
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
