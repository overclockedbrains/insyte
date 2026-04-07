'use client'

import type { ReactNode } from 'react'
import { Component } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
  onRetry?: () => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  showDetails: boolean
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null, showDetails: false }
  }

  public static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: unknown) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[Simulation ErrorBoundary]', error, errorInfo)
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null, showDetails: false })
    this.props.onRetry?.()
  }

  private toggleDetails = () => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }))
  }

  public render() {
    if (!this.state.hasError) {
      return this.props.children
    }

    return (
      <div className="h-[calc(100vh-3.5rem)] flex items-center justify-center px-4">
        <div className="glass-panel w-full max-w-xl rounded-3xl border border-error/30 p-6">
          <h2 className="text-lg font-bold font-headline text-on-surface">
            Simulation failed to render
          </h2>
          <p className="mt-2 text-sm text-on-surface-variant">
            Something went wrong while rendering this scene. You can retry safely.
          </p>
          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={this.handleRetry}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-on-primary bg-primary hover:opacity-90 transition-opacity"
            >
              Retry
            </button>
            {process.env.NODE_ENV !== 'production' && this.state.error && (
              <button
                type="button"
                onClick={this.toggleDetails}
                className="rounded-xl px-3 py-2 text-xs font-medium text-on-surface-variant bg-surface-container-high hover:text-on-surface transition-colors"
              >
                {this.state.showDetails ? 'Hide details' : 'Show details'}
              </button>
            )}
          </div>
          {process.env.NODE_ENV !== 'production' &&
            this.state.showDetails &&
            this.state.error && (
              <pre className="mt-4 max-h-56 overflow-auto rounded-xl bg-surface-container-low p-3 text-xs text-error whitespace-pre-wrap">
                {this.state.error.stack ?? this.state.error.message}
              </pre>
            )}
        </div>
      </div>
    )
  }
}
