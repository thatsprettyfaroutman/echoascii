import { EchoasciiError } from './errors'
import { measure } from './layout'

export const COLOR_NAMES = [
  'red',
  'green',
  'yellow',
  'blue',
  'magenta',
  'cyan',
  'white',
  'gray',
] as const

export type ColorName = (typeof COLOR_NAMES)[number]

type Rgb = readonly [number, number, number]

export interface ColorOptions {
  /** A color name, or a hex color like "#ff8800" */
  color?: ColorName | (string & {})
  rainbow?: boolean
  /** Two or more colors, like "red,blue" or ["#ff0000", "#0000ff"] */
  gradient?: string | string[]
  /** Use 24-bit colors. Defaults to on when $COLORTERM says the terminal supports it. */
  truecolor?: boolean
}

// Named colors use the terminal's own palette, these are for gradients
const ANSI: Record<ColorName, number> = {
  red: 31,
  green: 32,
  yellow: 33,
  blue: 34,
  magenta: 35,
  cyan: 36,
  white: 37,
  gray: 90,
}

const RGB: Record<ColorName, Rgb> = {
  red: [255, 85, 85],
  green: [80, 250, 123],
  yellow: [241, 250, 140],
  blue: [80, 140, 255],
  magenta: [255, 121, 198],
  cyan: [139, 233, 253],
  white: [248, 248, 242],
  gray: [128, 128, 128],
}

const RESET = '\x1b[0m'

const rgb = (channel: (index: number) => number): Rgb => [
  channel(0),
  channel(1),
  channel(2),
]

const isColorName = (value: string): value is ColorName =>
  (COLOR_NAMES as readonly string[]).includes(value)

export const supportsTruecolor = (
  env: Record<string, string | undefined> = process.env,
): boolean => env.COLORTERM === 'truecolor' || env.COLORTERM === '24bit'

// Accepts "red", "#f80" or "ff8800". The # is optional because shells treat
// a word starting with # as a comment.
const parseColor = (value: string): Rgb => {
  const name = value.trim().toLowerCase()
  if (isColorName(name)) return RGB[name]
  const hex = name.replace(/^#/, '')
  if (/^([0-9a-f]{3}|[0-9a-f]{6})$/.test(hex)) {
    const full = hex.length === 3 ? [...hex].map((c) => c + c).join('') : hex
    return rgb((i) => parseInt(full.slice(i * 2, i * 2 + 2), 16))
  }
  throw new EchoasciiError(
    `Unknown color "${value}". Use one of ${COLOR_NAMES.join(', ')}, or a hex color like "#ff8800"`,
  )
}

const parseGradient = (gradient: string | string[]): Rgb[] => {
  const stops = (Array.isArray(gradient) ? gradient : gradient.split(','))
    .map((stop) => stop.trim())
    .filter(Boolean)
  if (stops.length < 2) {
    throw new EchoasciiError(
      'A gradient needs at least two colors, like "red,blue"',
    )
  }
  return stops.map(parseColor)
}

// The 256 color palette has a 6x6x6 color cube starting at 16
const code = ([r, g, b]: Rgb, truecolor: boolean): string => {
  if (truecolor) return `\x1b[38;2;${r};${g};${b}m`
  const level = (c: number) => Math.round((c / 255) * 5)
  return `\x1b[38;5;${16 + 36 * level(r) + 6 * level(g) + level(b)}m`
}

// Colors each non-space character, only emitting a code when it changes
const paint = (lines: string[], colorAt: (x: number, y: number) => string) =>
  lines.map((line, y) => {
    let output = ''
    let current: string | undefined
    for (const [x, char] of [...line].entries()) {
      if (char !== ' ') {
        const next = colorAt(x, y)
        if (next !== current) output += next
        current = next
      }
      output += char
    }
    return current === undefined ? output : output + RESET
  })

// Three phase-shifted sine waves, like lolcat, running diagonally
const rainbowAt = (position: number): Rgb =>
  rgb((i) =>
    Math.round((Math.sin(0.15 * position + (i * 2 * Math.PI) / 3) + 1) * 127.5),
  )

const mix = (stops: Rgb[], t: number): Rgb => {
  const scaled = Math.min(Math.max(t, 0), 1) * (stops.length - 1)
  const index = Math.min(Math.floor(scaled), stops.length - 2)
  const from = stops[index] ?? stops[0]!
  const to = stops[index + 1] ?? from
  const f = scaled - index
  return rgb((i) => Math.round(from[i]! + (to[i]! - from[i]!) * f))
}

/** Throws for unknown colors or conflicting options, before any rendering */
export const validateColors = (options: ColorOptions): void => {
  const set = [options.color, options.rainbow, options.gradient].filter(
    (value) => value !== undefined && value !== false,
  )
  if (set.length > 1) {
    throw new EchoasciiError('Use only one of color, rainbow and gradient')
  }
  if (options.color !== undefined) parseColor(options.color)
  if (options.gradient !== undefined) parseGradient(options.gradient)
}

export const colorize = (lines: string[], options: ColorOptions): string[] => {
  const truecolor = options.truecolor ?? supportsTruecolor()

  if (options.rainbow) {
    return paint(lines, (x, y) => code(rainbowAt(x / 2 + y), truecolor))
  }

  if (options.gradient !== undefined) {
    // Run from the first visible column to the last, ignoring padding
    const stops = parseGradient(options.gradient)
    const { left = 0, right = 1 } = measure(lines) ?? {}
    const span = Math.max(1, right - 1 - left)
    return paint(lines, (x) => code(mix(stops, (x - left) / span), truecolor))
  }

  if (options.color !== undefined) {
    const name = options.color.trim().toLowerCase()
    const start = isColorName(name)
      ? `\x1b[${ANSI[name]}m`
      : code(parseColor(name), truecolor)
    return lines.map((line) => (line.trim() ? start + line + RESET : line))
  }

  return lines
}
