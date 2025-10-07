import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    this.props.onError?.(error, { componentStack: errorInfo?.componentStack });
  }

  componentDidUpdate(prevProps) {
    // Reset when any key in resetKeys changes
    const { resetKeys } = this.props;
    if (!this.state.error || !resetKeys || !prevProps.resetKeys) return;
    const changed = resetKeys.some((key, i) => !Object.is(key, prevProps.resetKeys[i]));
    if (changed) this.reset();
  }

  reset = () => {
    this.setState({ error: null });
    this.props.onReset?.();
  };

  render() {
    const { error } = this.state;
    const { children, fallback } = this.props;

    if (error) {
      if (typeof fallback === "function") return fallback({ error, reset: this.reset });
      if (fallback) return fallback;
      return (
        <div style={{ padding: 16, border: "1px solid #fee2e2", background: "#fef2f2", borderRadius: 10 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Something went wrong</div>
          <div style={{ fontSize: 13, color: "#7f1d1d", marginBottom: 8 }}>{error.message || String(error)}</div>
          <button onClick={this.reset} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: "6px 10px", cursor: "pointer", background: "white" }}>
            Try again
          </button>
        </div>
      );
    }

    return children;
  }
}