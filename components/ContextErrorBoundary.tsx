"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** Label shown in the fallback UI, e.g. "Doctor" or "Clinic" */
  zone: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Catches errors thrown inside context providers so a crash in one
 * zone (doctor / clinic) does not propagate to the root layout.
 */
export default class ContextErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "60vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              padding: "32px 24px",
              maxWidth: 400,
              width: "100%",
              textAlign: "center",
              boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
            }}
          >
            <h2
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: "#0f172a",
                marginBottom: 8,
              }}
            >
              {this.props.zone}: context error
            </h2>
            <p
              style={{
                fontSize: 13,
                color: "#94a3b8",
                marginBottom: 16,
                wordBreak: "break-word",
              }}
            >
              {this.state.error?.message ?? "Unknown error"}
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              style={{
                padding: "10px 20px",
                background: "#0d9488",
                color: "#fff",
                border: "none",
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
