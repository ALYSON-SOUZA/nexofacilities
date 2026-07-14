import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackLabel?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary]", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border-2 border-rose-200 shadow-md max-w-lg w-full p-6 text-center">
            <div className="h-14 w-14 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 mx-auto mb-4 border border-rose-200">
              <AlertCircle className="h-7 w-7" />
            </div>
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight mb-2">
              {this.props.fallbackLabel || "Algo deu errado"}
            </h2>
            <p className="text-[11px] text-slate-500 font-bold mb-1">
              Ocorreu um erro inesperado na aplicação. Suas dados locais estão seguros no navegador.
            </p>
            {this.state.error && (
              <p className="text-[11px] text-rose-600 font-mono bg-rose-50 rounded-lg p-2 mt-3 text-left overflow-auto max-h-32">
                {this.state.error.message}
              </p>
            )}
            <div className="flex gap-2 mt-5 justify-center">
              <button
                onClick={this.handleReset}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-black uppercase tracking-wider transition-colors cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Tentar Novamente
              </button>
              <button
                onClick={this.handleReload}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-slate-200 hover:bg-slate-50 text-slate-600 text-[11px] font-black uppercase tracking-wider transition-colors cursor-pointer"
              >
                Recarregar Página
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
