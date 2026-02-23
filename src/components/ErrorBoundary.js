import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { captureError } from '../utils/errorReporting';
import { error as logError } from '../utils/logger';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(_error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });

    // Log error locally
    logError('ErrorBoundary caught an error:', error, errorInfo);

    // Send to error reporting service (Sentry, LogRocket, etc.)
    captureError(error, {
      componentStack: errorInfo.componentStack,
      errorBoundary: true,
      userAgent: navigator.userAgent,
      url: window.location.href,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="empty-state">
          <div className="empty-state-icon"><AlertTriangle size={20} /></div>
          <h2 className="empty-state-title">Something went wrong</h2>
          <p className="empty-state-description">
            We encountered an unexpected error. Please refresh the page or contact support if the
            problem persists.
          </p>
          <div className="empty-state-actions">
            <button className="btn btn-primary" onClick={() => window.location.reload()}>
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
