import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RefreshCw, AlertTriangle, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  isChunkError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      isChunkError: false
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    const errorMsg = error?.message || '';
    const isChunkError = 
      errorMsg.includes('Failed to fetch dynamically imported module') ||
      errorMsg.includes('Loading chunk') ||
      errorMsg.includes('dynamically imported module') ||
      errorMsg.includes('Importing a module script failed');

    return { hasError: true, error, isChunkError };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Application Error Boundary caught:', error, errorInfo);

    // Auto-recover once from chunk load errors caused by PWA cache updates / new build deployments
    const errorMsg = error?.message || '';
    if (
      errorMsg.includes('Failed to fetch dynamically imported module') ||
      errorMsg.includes('Loading chunk') ||
      errorMsg.includes('dynamically imported module') ||
      errorMsg.includes('Importing a module script failed')
    ) {
      const lastReload = sessionStorage.getItem('pwa_chunk_reload_ts');
      const now = Date.now();
      if (!lastReload || now - Number(lastReload) > 12000) {
        sessionStorage.setItem('pwa_chunk_reload_ts', String(now));
        console.log('[PWA Stability] Auto-reloading to load fresh application bundle assets...');
        window.location.reload();
      }
    }
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 text-center select-none">
          <div className="max-w-md w-full p-8 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 mx-auto flex items-center justify-center mb-4">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <h1 className="text-xl font-extrabold text-white mb-2 tracking-tight">
              {this.state.isChunkError ? 'New App Version Available' : 'Application Recoverable Notice'}
            </h1>

            <p className="text-slate-400 mb-6 text-xs leading-relaxed">
              {this.state.isChunkError
                ? 'The application has been updated with new features and improvements. Please reload to activate the latest version.'
                : (this.state.error?.message || 'An unexpected issue occurred while rendering this view.')}
            </p>

            <div className="flex flex-col sm:flex-row gap-2.5 justify-center">
              <button 
                onClick={() => {
                  this.setState({ hasError: false, error: null, isChunkError: false });
                }}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-colors font-bold text-xs border border-slate-700 cursor-pointer"
              >
                Try Recovering
              </button>
              <button 
                onClick={() => {
                  // Clear chunk reload timestamp to allow fresh reload
                  sessionStorage.removeItem('pwa_chunk_reload_ts');
                  window.location.reload();
                }}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-blue-600/30 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reload App</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
