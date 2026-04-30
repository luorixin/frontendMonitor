export function toSelector(target: Element): string {
  const parts: string[] = []
  let current: Element | null = target
  let depth = 0

  while (current && depth < 4) {
    const tagName = current.tagName.toLowerCase()
    if (!tagName) break

    if (current.id) {
      parts.unshift(`${tagName}#${current.id}`)
      break
    }

    const classNames = Array.from(current.classList).slice(0, 2)
    const suffix = classNames.length ? `.${classNames.join(".")}` : ""
    parts.unshift(`${tagName}${suffix}`)
    current = current.parentElement
    depth += 1
  }

  return parts.join(" > ")
}
