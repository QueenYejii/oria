import { Component, type ErrorInfo, type ReactNode } from "react";

type AppErrorBoundaryProps = {
  children: ReactNode;
};

type AppErrorBoundaryState = {
  error: Error | null;
};

function isDynamicImportError(error: Error | null) {
  const message = error?.message ?? "";

  return (
    message.includes("Failed to fetch dynamically imported module") ||
    message.includes("Importing a module script failed") ||
    message.includes("error loading dynamically imported module") ||
    message.includes("ChunkLoadError")
  );
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    // Keep the boundary silent in production; the UI below gives users a recovery path.
  }

  render() {
    if (this.state.error) {
      const isChunkError = isDynamicImportError(this.state.error);

      return (
        <main className="route-error">
          <div>
            <p className="eyebrow">View interrupted</p>
            <h1>{isChunkError ? "A fresh version of Oria is ready." : "This view needs a refresh."}</h1>
            <p>
              {isChunkError
                ? "Your browser is holding an older app bundle. Reload once to continue with the latest deployment."
                : "Oria could not finish rendering this screen. Try again, or reload if the issue persists."}
            </p>
            <button
              className="button primary"
              type="button"
              onClick={() => {
                if (isChunkError) {
                  window.location.reload();
                  return;
                }

                this.setState({ error: null });
              }}
            >
              {isChunkError ? "Reload Oria" : "Try again"}
            </button>
            <details className="route-error-details">
              <summary>Technical detail</summary>
              <code>{this.state.error.message}</code>
            </details>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}
