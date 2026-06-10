import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="glass-card p-8 text-center">
            <p className="text-gray-500 mb-4">Couldn&apos;t load this section.</p>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="btn-secondary text-sm"
            >
              Try again
            </button>
          </div>
        )
      )
    }

    return this.props.children
  }
}
