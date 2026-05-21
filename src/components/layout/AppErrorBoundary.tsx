import { Component, type ErrorInfo, type ReactNode } from "react";

type AppErrorBoundaryProps = {
  children: ReactNode;
};

type AppErrorBoundaryState = {
  error: Error | null;
};

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Oria route failed", error, info);
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
              onClick={() => this.setState({ error: null })}
            >
              Try again
            </button>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}
