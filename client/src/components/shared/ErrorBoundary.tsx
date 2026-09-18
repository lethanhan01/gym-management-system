import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home, ChevronDown } from 'lucide-react'

export interface ErrorBoundaryProps {
  children: ReactNode
  fallbackTitle?: string
  fallbackMessage?: string
  onReset?: () => void
  onNavigateHome?: () => void
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  resetKeys?: Array<unknown>
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  showDetails: boolean
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false,
  }

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
      errorInfo: null,
      showDetails: false,
    }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo })
    console.error('[ErrorBoundary caught error]:', error, errorInfo)
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
  }

  public componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (this.state.hasError && this.props.resetKeys) {
      const hasResetKeyChanged = this.props.resetKeys.some(
        (key, idx) => key !== prevProps.resetKeys?.[idx]
      )
      if (hasResetKeyChanged) {
        this.resetState()
      }
    }
  }

  public resetState = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    })
  }

  private handleReset = () => {
    if (this.props.onReset) {
      this.props.onReset()
      this.resetState()
    } else {
      this.resetState()
      window.location.reload()
    }
  }

  private handleNavigateHome = () => {
    this.resetState()
    if (this.props.onNavigateHome) {
      this.props.onNavigateHome()
    } else {
      window.location.href = '/'
    }
  }

  public render() {
    if (this.state.hasError) {
      const isDev = import.meta.env.DEV

      return (
        <div
          role="alert"
          aria-live="assertive"
          className="flex min-h-[400px] w-full flex-col items-center justify-center rounded-2xl border border-red-500/20 bg-[var(--rogym-bg-card)] p-8 text-center shadow-xl"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 text-red-400">
            <AlertTriangle className="h-8 w-8" />
          </div>

          <h2 className="mt-4 text-xl font-bold text-white">
            {this.props.fallbackTitle || 'Đã có sự cố xảy ra / An unexpected error occurred'}
          </h2>

          <p className="mt-2 max-w-md text-sm text-[var(--rogym-text-secondary)]">
            {this.props.fallbackMessage ||
              'Đã xảy ra lỗi không mong muốn khi hiển thị nội dung này. Vui lòng thử tải lại trang.'}
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20 transition-all cursor-pointer"
            >
              <RefreshCw className="h-4 w-4" /> Thử tải lại / Reload
            </button>

            <button
              type="button"
              onClick={this.handleNavigateHome}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--rogym-teal)] px-4 py-2 text-sm font-semibold text-black hover:opacity-90 transition-all cursor-pointer"
            >
              <Home className="h-4 w-4" /> Về trang chủ / Home
            </button>
          </div>

          {isDev && this.state.error && (
            <div className="mt-6 w-full max-w-2xl text-left">
              <button
                type="button"
                onClick={() => this.setState((s) => ({ showDetails: !s.showDetails }))}
                className="flex items-center gap-1 text-xs text-red-400 hover:underline cursor-pointer"
              >
                <ChevronDown className="h-3 w-3" /> Chi tiết lỗi (Chỉ hiển thị ở chế độ DEV)
              </button>
              {this.state.showDetails && (
                <pre className="mt-2 overflow-auto rounded-xl bg-black/60 p-4 text-xs text-red-300 font-mono border border-red-500/20 max-h-60 whitespace-pre-wrap">
                  {this.state.error.toString()}
                  {'\n\n'}
                  {this.state.errorInfo?.componentStack}
                </pre>
              )}
            </div>
          )}
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
