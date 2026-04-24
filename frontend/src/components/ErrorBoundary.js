import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          minHeight: '400px', padding: '40px',
        }}>
          <div style={{ textAlign: 'center', maxWidth: '480px' }}>
            <div style={{
              width: '72px', height: '72px', borderRadius: '50%', background: '#fef2f2',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
            }}>
              <AlertTriangle size={36} color="#ef4444" />
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#111827', margin: '0 0 8px' }}>
              Something went wrong
            </h2>
            <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 24px', lineHeight: 1.6 }}>
              An unexpected error occurred. Please try refreshing the page or go back to the dashboard.
            </p>
            {this.state.error && (
              <div style={{
                background: '#fef2f2', borderRadius: '8px', padding: '12px',
                marginBottom: '24px', textAlign: 'left', border: '1px solid #fecaca',
              }}>
                <div style={{ fontSize: '12px', fontWeight: '600', color: '#991b1b', marginBottom: '4px' }}>Error Details</div>
                <div style={{ fontSize: '12px', color: '#b91c1c', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                  {this.state.error.toString()}
                </div>
              </div>
            )}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button className="btn btn-primary"
                onClick={() => window.location.reload()}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <RefreshCw size={16} /> Refresh Page
              </button>
              <button className="btn btn-secondary"
                onClick={() => { window.location.href = '/'; }}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Home size={16} /> Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
