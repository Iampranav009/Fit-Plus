import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { BrandMark } from './BrandMark';
import { GlassButton } from './GlassButton';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error?.message || 'An unexpected rendering issue occurred.',
    };
  }

  componentDidCatch(error: Error) {
    if (typeof window !== 'undefined') {
      void fetch('/api/monitoring/error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: error.name || 'Error',
          message: (error.message || 'Unknown error').slice(0, 280),
          route: window.location.pathname,
        }),
      }).catch(() => undefined);
    }
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen fp-ambient-canvas text-[#F5F5F7] flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full surface-card rounded-[24px] p-6 sm:p-8 text-center space-y-4">
          <div className="flex justify-center">
            <BrandMark />
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#FF6B70]/15 border border-[#FF6B70]/30 text-[#FF6B70] mx-auto flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" aria-hidden="true" />
          </div>
          <h1 className="text-[22px] font-semibold">Something interrupted this view</h1>
          <p className="text-[14px] text-[#A2A8B5]">
            Your coaching records are safe. Reload FitPlus to recover your session.
          </p>
          <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
            <GlassButton
              fullWidth
              onClick={() => window.location.reload()}
            >
              <RotateCcw className="w-4 h-4" aria-hidden="true" />
              Reload page
            </GlassButton>
            <GlassButton
              variant="secondary"
              fullWidth
              onClick={() => {
                this.setState({ hasError: false, message: '' });
                window.location.href = '/';
              }}
            >
              Go to home
            </GlassButton>
          </div>
        </div>
      </div>
    );
  }
}
