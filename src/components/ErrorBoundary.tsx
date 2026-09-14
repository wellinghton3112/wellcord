"use client";
import { Component, type ReactNode } from "react";
import { logger } from "@/lib/logger";

type Props = { children: ReactNode; fallback?: ReactNode };
type State = { hasError: boolean; error?: Error };

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    logger.error("React render error", "ErrorBoundary", {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo?.componentStack,
    });
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="min-h-screen bg-[#313338] flex items-center justify-center p-4">
          <div className="bg-[#2B2D31] rounded-lg p-8 max-w-md w-full text-center shadow-2xl">
            <div className="text-4xl mb-4">💥</div>
            <h2 className="text-xl font-bold text-white mb-2">Algo deu errado</h2>
            <p className="text-zinc-400 text-sm mb-4">
              O WellCORD encontrou um erro inesperado. Tente recarregar a página.
            </p>
            <p className="text-zinc-600 text-xs font-mono mb-4 break-all">
              {this.state.error?.message}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-[#5865F2] hover:bg-[#4752C4] rounded text-sm font-medium text-white"
            >
              Recarregar
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
