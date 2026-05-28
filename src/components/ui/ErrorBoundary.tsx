import { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props { children: ReactNode; fallback?: ReactNode; }
interface State { hasError: boolean; error?: Error; }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div style={{ padding: 32, color: '#ef4444' }}>
          <h2>Something went wrong</h2>
          <pre style={{ fontSize: 12, opacity: 0.7 }}>{this.state.error?.message}</pre>
          <button onClick={() => this.setState({ hasError: false })}>Retry</button>
        </div>
      );
    }
    return this.props.children;
  }
}
