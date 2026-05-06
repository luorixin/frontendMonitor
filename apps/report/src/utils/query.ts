export function buildParams(input: Record<string, string | number | undefined | null>) {
  const params = new URLSearchParams()

  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null || value === "") continue
    params.set(key, String(value))
  }

  return params
}
