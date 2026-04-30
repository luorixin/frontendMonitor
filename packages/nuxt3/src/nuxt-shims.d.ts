declare module "@nuxt/kit" {
  export function createResolver(url: string): {
    resolve: (...segments: string[]) => string
  }

  export function addPlugin(options: {
    src: string
    mode?: "client" | "server" | "all"
  }): void

  export function addTemplate(options: {
    filename: string
    getContents: () => string
  }): { dst: string }

  export function defineNuxtModule<T>(options: {
    meta?: Record<string, unknown>
    defaults?: T
    setup: (moduleOptions: T, nuxt: {
      options: {
        runtimeConfig: {
          public: Record<string, unknown>
        }
      }
    }) => void
  }): unknown
}

declare module "#app" {
  export function defineNuxtPlugin(
    plugin: (nuxtApp: {
      vueApp: {
        use: (plugin: unknown, options?: unknown) => void
      }
      $config?: {
        public?: Record<string, unknown>
      }
    }) => void
  ): unknown
}
