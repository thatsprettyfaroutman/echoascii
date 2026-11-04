import { EchoasciiError } from './errors'

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

/** Draws every character with the fill characters instead, taking turns */
export const fill = (lines: string[], chars: string): string[] => {
  const pool = [...chars.replace(/\s/g, '')]
  let next = 0
  return lines.map((line) =>
    [...line]
      .map((char) => (char === ' ' ? char : pool[next++ % pool.length]!))
      .join(''),
  )
}

/** A shadow one cell down and to the right, wherever the art leaves room */
export const shadow = (lines: string[], mark: string): string[] => {
  const width = widest(lines) + 1
  const art = lines.map((line) => [...line])
  const rows = [...art, []].map((row) => [
    ...row,
    ...Array<string>(width - row.length).fill(' '),
  ])
  art.forEach((row, y) =>
    row.forEach((char, x) => {
      if (char !== ' ' && rows[y + 1]![x + 1] === ' ')
        rows[y + 1]![x + 1] = mark
    }),
  )
  return rows.map((row) => row.join(''))
}

type CommentStyle = { line: string } | { block: [string, string, string] }

const LINE_COMMENTS: Record<string, string[]> = {
  '//': [
    'js',
    'javascript',
    'ts',
    'typescript',
    'jsx',
    'tsx',
    'c',
    'cpp',
    'c++',
    'h',
    'java',
    'go',
    'rust',
    'rs',
    'swift',
    'kotlin',
    'kt',
    'cs',
    'csharp',
    'scala',
    'dart',
    'php',
    'zig',
  ],
  '#': [
    'py',
    'python',
    'sh',
    'bash',
    'zsh',
    'fish',
    'rb',
    'ruby',
    'yaml',
    'yml',
    'toml',
    'r',
    'pl',
    'perl',
    'make',
    'makefile',
    'dockerfile',
    'nix',
    'ex',
    'elixir',
    'ps1',
    'powershell',
    'conf',
  ],
  '--': ['sql', 'lua', 'hs', 'haskell', 'elm', 'ada'],
  ';': ['lisp', 'clj', 'clojure', 'el', 'elisp', 'scheme', 'asm', 'ini'],
  '%': ['tex', 'latex', 'erl', 'erlang', 'matlab'],
}

const BLOCK_COMMENTS: Record<string, [[string, string, string], string[]]> = {
  '/*': [
    ['/*', ' * ', ' */'],
    ['css', 'scss', 'less'],
  ],
  '<!--': [
    ['<!--', '  ', '-->'],
    ['html', 'xml', 'svg', 'md', 'markdown', 'vue'],
  ],
}

/** A language name like "js" or "py", or a comment marker like "//" or "#" */
export const commentStyle = (name: string): CommentStyle => {
  const key = name.trim().toLowerCase()
  for (const [marker, languages] of Object.entries(LINE_COMMENTS)) {
    if (key === marker || languages.includes(key)) return { line: marker }
  }
  for (const [marker, [block, languages]] of Object.entries(BLOCK_COMMENTS)) {
    if (key === marker || languages.includes(key)) return { block }
  }
  throw new EchoasciiError(
    `Unknown comment style "${name}". Use a language like js, py, sh, sql, css or html, or a marker like // or #`,
  )
}

/** Wraps the lines in code comments, for file headers and dividers */
export const comment = (lines: string[], name: string): string[] => {
  const style = commentStyle(name)
  if ('line' in style) {
    return lines.map((line) => `${style.line} ${line}`.trimEnd())
  }
  const [start, middle, end] = style.block
  return [start, ...lines.map((line) => (middle + line).trimEnd()), end]
}
