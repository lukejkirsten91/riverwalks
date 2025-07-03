import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to monitoring service (without exposing user data)
    const sanitizedError = {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : 'server',
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
      componentStack: errorInfo.componentStack
    };

    console.error('🚨 Application Error Boundary Caught:', sanitizedError);

    // Update state with error details for debugging
    this.setState({
      error,
      errorInfo
    });

    // In production, you would send this to an error monitoring service
    // For now, we'll just log it safely without user data
    if (process.env.NODE_ENV === 'production') {
      // Send to monitoring service (implement when ready)
      this.logErrorToService(sanitizedError);
    }
  }

  private logErrorToService(error: any) {
    // Placeholder for error monitoring service integration
    // This could be Sentry, LogRocket, or custom logging
    try {
      // Example: Send to monitoring endpoint
      fetch('/api/log-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(error)
      }).catch(e => console.error('Failed to log error to service:', e));
    } catch (e) {
      console.error('Error logging service failed:', e);
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-modern p-8 max-w-lg w-full mx-auto text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Something went wrong
            </h1>
            
            <p className="text-gray-600 mb-6">
              We apologize for the inconvenience. An unexpected error occurred while using Riverwalks. 
              Our team has been notified and is working to fix this issue.
            </p>

            {/* Error details for development */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Error Details (Development Only):</h3>
                <p className="text-xs text-gray-700 font-mono break-all">
                  {this.state.error.message}
                </p>
                {this.state.error.stack && (
                  <details className="mt-2">
                    <summary className="text-xs text-gray-600 cursor-pointer">Stack Trace</summary>
                    <pre className="text-xs text-gray-600 mt-1 whitespace-pre-wrap break-all">
                      {this.state.error.stack}
                    </pre>
                  </details>
                )}
              </div>
            )}
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={this.handleRetry}
                className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                <RefreshCcw className="w-4 h-4" />
                Try Again
              </button>
              
              <button
                onClick={this.handleGoHome}
                className="flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-medium transition-colors"
              >
                <Home className="w-4 h-4" />
                Go to Home
              </button>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                If this problem persists, please contact our support team at{' '}
                <a href="mailto:support@riverwalks.co.uk" className="text-primary hover:underline">
                  support@riverwalks.co.uk
                </a>
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}