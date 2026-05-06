export type ApiEnvelope<T> = {
  code?: number
  data: T
  message?: string
  success?: boolean
}

export type TableEnvelope<T> = {
  code?: number
  data?: {
    rows?: T[]
    total?: number
  }
  msg?: string
  rows: T[]
  total: number
}
