import { Component, type ErrorInfo, type ReactNode } from 'react';

export interface ErrorBoundaryProps {
  readonly boundaryId: string;
  readonly label: string;
  readonly children: ReactNode;
}

interface ErrorBoundaryState {
  readonly hasError: boolean;
  readonly message: string | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, message: null };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    const message = error instanceof Error ? error.message : String(error);
    return { hasError: true, message };
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    // Surface to the console so the agent's visual-inspection step picks it up.
    // eslint-disable-next-line no-console
    console.error(`[error-boundary:${this.props.boundaryId}]`, error, info);
  }

  reset = (): void => {
    this.setState({ hasError: false, message: null });
  };

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;
    return (
      <div
        role="alert"
        data-testid={`error-boundary-${this.props.boundaryId}`}
        className="flex h-full flex-1 flex-col items-center justify-center gap-3 bg-background p-8 text-center"
      >
        <h2 className="text-base font-semibold text-foreground">
          {this.props.label} failed to render
        </h2>
        {this.state.message ? (
          <p
            data-testid={`error-boundary-${this.props.boundaryId}-message`}
            className="max-w-md text-xs font-mono text-destructive"
          >
            {this.state.message}
          </p>
        ) : null}
        <button
          type="button"
          data-testid={`error-boundary-${this.props.boundaryId}-reset`}
          onClick={this.reset}
          className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-3 py-1 text-xs font-medium text-foreground shadow-sm transition hover:bg-accent"
        >
          Reset
        </button>
      </div>
    );
  }
}
