import {
  addBreadcrumb,
  captureError,
  clearContext,
  destroy,
  flush,
  getOptions,
  init,
  intersectionDisconnect,
  intersectionObserver,
  intersectionUnobserve,
  sendLocal,
  setContext,
  setEnvironment,
  setRelease,
  setTag,
  setUser,
  track
} from "frontend-monitor-core"
import type { MonitorOptions } from "frontend-monitor-core"
import type { ErrorInfo, PropsWithChildren, ReactNode } from "react"
import { Component, useEffect } from "react"

export type ReactTracingProviderProps = PropsWithChildren<{
  options: MonitorOptions
  destroyOnUnmount?: boolean
}>

export function WebTracingProvider(
  props: ReactTracingProviderProps
): ReactNode {
  useEffect(() => {
    init(props.options)

    return () => {
      if (props.destroyOnUnmount) {
        destroy()
      }
    }
  }, [])

  return props.children ?? null
}

export type WebTracingErrorBoundaryProps = PropsWithChildren<{
  fallback?: ReactNode
}>

type WebTracingErrorBoundaryState = {
  hasError: boolean
}

export class WebTracingErrorBoundary extends Component<
  WebTracingErrorBoundaryProps,
  WebTracingErrorBoundaryState
> {
  state: WebTracingErrorBoundaryState = {
    hasError: false
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    this.setState({ hasError: true })
    captureError(error, {
      componentStack: info.componentStack,
      framework: "react"
    })
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return this.props.fallback ?? null
    }

    return this.props.children ?? null
  }
}

export function useWebTracing() {
  return {
	    captureError,
	    addBreadcrumb,
	    clearContext,
	    flush,
    getOptions,
    init,
    intersectionDisconnect,
    intersectionObserver,
    intersectionUnobserve,
	    sendLocal,
	    setContext,
	    setEnvironment,
	    setRelease,
	    setTag,
	    setUser,
    track
  }
}

export * from "frontend-monitor-core"
