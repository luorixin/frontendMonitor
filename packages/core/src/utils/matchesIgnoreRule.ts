export function matchesIgnoreRule(
  target: string,
  rules: Array<string | RegExp>
): boolean {
  return rules.some(rule => {
    if (typeof rule === "string") {
      return target.includes(rule)
    }

    rule.lastIndex = 0
    return rule.test(target)
  })
}
