declare module "vue" {
  export type Plugin<T = unknown> = {
    install: (app: App, options?: T) => void
  }

  export type App = {
    config: {
      errorHandler?: (
        error: unknown,
        instance: unknown,
        info: string
      ) => void
    }
    provide: (key: unknown, value: unknown) => void
  }

  export function inject<T>(key: unknown, fallback?: T): T
}
