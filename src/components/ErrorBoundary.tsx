'use client'

import React from 'react'

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    if (process.env.NODE_ENV !== 'production') {
      // Log verbose details only in development
      // eslint-disable-next-line no-console
      console.error('ErrorBoundary caught an error:', error, errorInfo)
      // eslint-disable-next-line no-console
      console.error('Error stack:', error.stack)
      // eslint-disable-next-line no-console
      console.error('Component stack:', errorInfo.componentStack)
    }
  }

  render() {
    if (this.state.hasError) {
      // Always show error UI, never return blank/null
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-[#141414] p-4" style={{ minHeight: '100vh' }}>
          <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-8 max-w-md w-full">
            <h1 className="text-2xl font-bold text-white mb-4">Something went wrong</h1>
            <p className="text-white/70 mb-4">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null })
                window.location.reload()
              }}
              className="bg-[#2BA3FF] hover:bg-[#2BA3FF]/80 text-white px-4 py-2 rounded-md transition-colors"
            >
              Reload Page
            </button>
            {this.state.error && (
              <details className="mt-4">
                <summary className="text-white/50 text-sm cursor-pointer">Error details</summary>
                <pre className="mt-2 text-xs text-white/50 overflow-auto bg-black/20 p-2 rounded max-h-40">
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
