import React from 'react'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, info: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    this.setState({ error, info })
    // Optionally log to an external service
    // console.error(error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6">
          <div className="max-w-3xl w-full bg-white/5 p-6 rounded-xl">
            <h2 className="text-2xl font-bold mb-2">Something went wrong</h2>
            <p className="text-sm text-gray-300 mb-4">The application encountered an error while rendering.</p>
            <details className="text-xs text-gray-400 whitespace-pre-wrap">
              {String(this.state.error && this.state.error.toString())}
              {this.state.info && this.state.info.componentStack}
            </details>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
