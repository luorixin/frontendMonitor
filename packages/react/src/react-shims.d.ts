declare module "react" {
  export type ReactNode = unknown
  export type PropsWithChildren<P = unknown> = P & {
    children?: ReactNode
  }

  export type ErrorInfo = {
    componentStack: string
  }

  export class Component<P = unknown, S = unknown> {
    constructor(props: P)
    props: Readonly<P>
    state: Readonly<S>
    render(): ReactNode
    componentDidCatch?(error: Error, info: ErrorInfo): void
    setState(state: Partial<S>): void
  }

  export function useEffect(
    effect: () => void | (() => void),
    deps?: readonly unknown[]
  ): void
}
