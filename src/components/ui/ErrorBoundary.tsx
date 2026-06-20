import { Component, Fragment, type ErrorInfo, type ReactNode } from 'react'
import { GlobalErrorFallback } from './GlobalErrorFallback'

interface Props {
  children: ReactNode
  /** Optional inline fallback (e.g. section-level boundary). Omit for full-page UI. */
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  retryKey: number
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    retryKey: 0,
    error: null,
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] Unhandled render error:', error, info.componentStack)
  }

  handleRetry = () => {
    this.setState((prev) => ({
      hasError: false,
      error: null,
      retryKey: prev.retryKey + 1,
    }))
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return <GlobalErrorFallback error={this.state.error} onRetry={this.handleRetry} />
    }

    return <Fragment key={this.state.retryKey}>{this.props.children}</Fragment>
  }
}
