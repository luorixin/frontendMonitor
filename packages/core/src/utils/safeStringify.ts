export function safeStringify(value: unknown): string {
  const visited = new WeakSet()

  return JSON.stringify(value, (_key, currentValue) => {
    if (typeof currentValue === "object" && currentValue !== null) {
      if (visited.has(currentValue)) return "[Circular]"
      visited.add(currentValue)
    }

    if (currentValue instanceof Error) {
      return {
        message: currentValue.message,
        name: currentValue.name,
        stack: currentValue.stack
      }
    }

    return currentValue
  })
}
