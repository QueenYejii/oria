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
      return (
        <main className="route-error">
          <div>
            <p className="eyebrow">Route error</p>
            <h1>Oria could not render this view.</h1>
            <p>{this.state.error.message}</p>
            <button
              className="button primary"
              type="button"
              onClick={() => {
                if (isDynamicImportError(this.state.error)) {
                  window.location.reload();
                  return;
                }

                this.setState({ error: null });
              }}
            >
              {isDynamicImportError(this.state.error) ? "Reload Oria" : "Try again"}
            </button>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}
