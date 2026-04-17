import React from 'react'

/**
 * Minimal error boundary (no external UI library).
 * @param {{ children: React.ReactNode, label?: string, className?: string }} props
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    if (typeof console !== 'undefined' && console.error) {
      console.error(this.props.label || 'ErrorBoundary', error, info?.componentStack)
    }
  }

  render() {
    if (this.state.error) {
      return (
        <div
          className={this.props.className || 'gh-error-boundary'}
          style={{
            padding: 16,
            border: '1px solid var(--border, #444)',
            borderRadius: 8,
            background: 'var(--bg-card, #1a1a1a)',
            color: 'var(--text-primary, #eee)',
            fontFamily: 'var(--font-mono, monospace)',
            fontSize: 13,
          }}
        >
          <strong>{this.props.label || 'Something went wrong'}</strong>
          <div style={{ marginTop: 8, opacity: 0.85 }}>{String(this.state.error?.message || this.state.error)}</div>
          <button
            type="button"
            style={{ marginTop: 12, cursor: 'pointer' }}
            onClick={() => this.setState({ error: null })}
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
