/** Rows [top, bottom) and columns [left, right) that hold the art */
export interface Bounds {
  top: number
  bottom: number
  left: number
  right: number
}

const chars = (line: string) => [...line]

export const lineWidth = (line: string): number => chars(line).length

export const widest = (lines: string[]): number =>
  Math.max(0, ...lines.map(lineWidth))

/** The smallest box around every non-space character */
export const measure = (lines: string[]): Bounds | undefined => {
  let bounds: Bounds | undefined
  lines.forEach((line, y) => {
    const start = line.search(/\S/)
    if (start === -1) return
    const left = lineWidth(line.slice(0, start))
    const right = lineWidth(line.trimEnd())
    bounds = bounds
      ? {
          top: bounds.top,
          bottom: y + 1,
          left: Math.min(bounds.left, left),
          right: Math.max(bounds.right, right),
        }
      : { top: y, bottom: y + 1, left, right }
  })
  return bounds
}

export const union = (a: Bounds | undefined, b: Bounds | undefined) =>
  a && b
    ? {
        top: Math.min(a.top, b.top),
        bottom: Math.max(a.bottom, b.bottom),
        left: Math.min(a.left, b.left),
        right: Math.max(a.right, b.right),
      }
    : (a ?? b)

/** Cuts the bounds out of the art, filling in missing rows and columns */
export const crop = (lines: string[], bounds: Bounds): string[] => {
  const width = bounds.right - bounds.left
  const rows: string[] = []
  for (let y = bounds.top; y < bounds.bottom; y++) {
    const row = chars(lines[y] ?? '').slice(bounds.left, bounds.right)
    rows.push(row.join('').padEnd(width))
  }
  return rows
}

export const border = (lines: string[], width: number): string[] => [
  `┌${'─'.repeat(width + 2)}┐`,
  ...lines.map((line) => `│ ${line}${' '.repeat(width - lineWidth(line))} │`),
  `└${'─'.repeat(width + 2)}┘`,
]

export const center = (
  lines: string[],
  width: number,
  columns: number,
): string[] => {
  const pad = ' '.repeat(Math.max(0, Math.floor((columns - width) / 2)))
  return lines.map((line) => (line ? pad + line : line))
}

/** Wraps the art in a code block, with a longer fence if the art has ``` */
export const markdown = (lines: string[]): string[] => {
  let fence = '```'
  while (lines.some((line) => line.includes(fence))) fence += '`'
  return [fence, ...lines, fence]
}
