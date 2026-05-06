export type ApiEnvelope<T> = {
  code?: number
  data: T
  message?: string
  success?: boolean
}

export type TableEnvelope<T> = {
  rows: T[]
  total: number
}
