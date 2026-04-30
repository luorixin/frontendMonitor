export function textPreview(input: string, maxLength = 80): string {
  return input.replace(/\s+/g, " ").trim().slice(0, maxLength)
}
