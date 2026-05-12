export function byteLength(input: string): number {
  if (typeof TextEncoder === "function") {
    return new TextEncoder().encode(input).byteLength
  }

  return new Blob([input]).size
}
