import type { StackFrame } from "../core/types"

const CHROME_FRAME_RE = /^\s*at\s+(?:(.*?)\s+\()?(.+?):(\d+):(\d+)\)?\s*$/
const FIREFOX_FRAME_RE = /^\s*(?:(.*?)@)?(.+?):(\d+):(\d+)\s*$/

export function parseStackFrames(stack?: string): StackFrame[] {
  if (!stack) return []

  const frames: StackFrame[] = []
  for (const line of stack.split("\n").slice(1)) {
    const frame = parseStackLine(line)
    if (frame) {
      frames.push(frame)
    }
  }
  return frames
}

function parseStackLine(line: string): StackFrame | null {
  const chromeMatch = line.match(CHROME_FRAME_RE)
  if (chromeMatch) {
    return buildFrame(chromeMatch[2], chromeMatch[3], chromeMatch[4], chromeMatch[1])
  }

  const firefoxMatch = line.match(FIREFOX_FRAME_RE)
  if (firefoxMatch) {
    return buildFrame(
      firefoxMatch[2],
      firefoxMatch[3],
      firefoxMatch[4],
      firefoxMatch[1]
    )
  }

  return null
}

function buildFrame(
  filename: string,
  line: string,
  column: string,
  functionName?: string
): StackFrame {
  return {
    colno: Number(column),
    filename,
    function: functionName || undefined,
    lineno: Number(line)
  }
}
