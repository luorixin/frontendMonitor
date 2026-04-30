export function uuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }

  return "xxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, token => {
    const rand = Math.floor(Math.random() * 16)
    const value = token === "x" ? rand : (rand & 0x3) | 0x8
    return value.toString(16)
  })
}
