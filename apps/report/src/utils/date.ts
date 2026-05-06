import dayjs, { type Dayjs } from "dayjs"

export function formatDateTime(value?: string) {
  if (!value) return "-"
  const time = dayjs(value)
  return time.isValid() ? time.format("YYYY-MM-DD HH:mm:ss") : value
}

export function toBackendDateTime(value?: Dayjs | null) {
  return value ? value.format("YYYY-MM-DD HH:mm:ss") : undefined
}

export function formatMetric(value: number, digits = 0) {
  return new Intl.NumberFormat("zh-CN", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits
  }).format(value)
}
