import { Component, type ReactNode } from "react";

export default class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error) {
    // eslint-disable-next-line no-console
    console.error("[SSI Accounting] Render error:", error);
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, fontFamily: "system-ui, sans-serif", maxWidth: 760, margin: "40px auto" }}>
          <h2 style={{ color: "#C0392B", marginBottom: 6 }}>The app hit an error while loading</h2>
          <p style={{ color: "#5C6470", marginTop: 0 }}>
            This message replaces a blank screen so the cause is visible. Copy the details below (or open the browser
            console) and share them and I'll fix it.
          </p>
          <pre style={{ whiteSpace: "pre-wrap", background: "#F4F6FA", padding: 16, borderRadius: 8, fontSize: 12, overflow: "auto", border: "1px solid #E3E6EC" }}>
            {String(this.state.error?.stack || this.state.error)}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}
