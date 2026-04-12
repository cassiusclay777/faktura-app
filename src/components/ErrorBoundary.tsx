"use client";

import { Component, type ReactNode } from "react";
import { formatUnknownError } from "@/lib/formatUnknownError";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    const msg = formatUnknownError(error);
    if (error instanceof Error && error.message === msg) {
      return { hasError: true, error };
    }
    return {
      hasError: true,
      error: new Error(msg, {
        cause: error instanceof Error ? error : error,
      }),
    };
  }

  componentDidCatch(error: unknown, errorInfo: React.ErrorInfo): void {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    
    // Call custom error handler if provided
    if (this.props.onError) {
      const err =
        error instanceof Error
          ? error
          : new Error(formatUnknownError(error), { cause: error });
      this.props.onError(err, errorInfo);
    }
    
    // You could also send error to monitoring service here
    // sendErrorToMonitoring(error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="rounded-lg border border-red-800 bg-red-950/50 p-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-red-300">
                  Něco se pokazilo
                </h3>
                <p className="mt-1 text-sm text-red-400">
                  Omlouváme se, došlo k neočekávané chybě.
                </p>
              </div>
              <button
                onClick={this.handleReset}
                className="rounded-md bg-red-800 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-red-700"
              >
                Zkusit znovu
              </button>
            </div>
            
            {this.state.error && (
              <div className="mt-4 rounded-md bg-black/50 p-4">
                <p className="mb-2 text-sm font-medium text-red-300">Chyba:</p>
                <pre className="overflow-auto rounded bg-black p-3 text-xs text-red-200">
                  {formatUnknownError(this.state.error)}
                </pre>
                {process.env.NODE_ENV === "development" && (
                  <p className="mt-2 text-xs text-zinc-500">
                    Tato zpráva se zobrazuje pouze v režimu vývoje.
                  </p>
                )}
              </div>
            )}
            
            <div className="mt-4 text-sm text-zinc-400">
              <p className="mb-2">Co můžete zkusit:</p>
              <ul className="list-inside list-disc space-y-1 pl-4">
                <li>Zkuste obnovit stránku</li>
                <li>Zkontrolujte připojení k internetu</li>
                <li>Pokud problém přetrvává, kontaktujte podporu</li>
              </ul>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook for using error boundary programmatically
export function useErrorHandler(): (error: Error) => void {
  const handleError = (error: Error): void => {
    // In a real app, you might want to log this to a service
    console.error("Error caught by useErrorHandler:", error);
    
    // You could also show a toast notification here
    // toast.error(`Chyba: ${error.message}`);
    
    throw error; // Re-throw to be caught by ErrorBoundary
  };
  
  return handleError;
}

// Simple error display component for inline errors
export function ErrorDisplay({ error, title = "Chyba" }: { error: unknown; title?: string }) {
  const errorMessage = formatUnknownError(error);
  
  return (
    <div className="rounded-md border border-red-800 bg-red-950/30 p-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-800 text-xs font-bold text-white">
          !
        </div>
        <div className="flex-1">
          <h4 className="font-medium text-red-300">{title}</h4>
          <p className="mt-1 text-sm text-red-200">{errorMessage}</p>
        </div>
      </div>
    </div>
  );
}