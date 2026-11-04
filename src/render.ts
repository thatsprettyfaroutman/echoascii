import figlet, { type FontName } from 'figlet'
import { colorize, validateColors, type ColorOptions } from './colors'
import { EchoasciiError } from './errors'
import { DEFAULT_FONT, resolveFont } from './fonts'
import {
  border,
  center,
  crop,
  markdown,
  measure,
  union,
  widest,
  type Bounds,
} from './layout'

export interface RenderOptions extends ColorOptions {
  /** Font name. Case, spaces and dashes don't matter. Defaults to "Larry 3D". */
  font?: string
  /** Wrap at this many columns. Also the width that `center` centers in. */
  width?: number
  /** Center the banner within `width`, or 80 columns */
  center?: boolean
  /** Remove the blank space around the banner */
  trim?: boolean
  /** Draw a box around the banner */
  border?: boolean
  /** Wrap the banner in a markdown code block. Implies `trim`, skips colors. */
  markdown?: boolean
}

const DEFAULT_COLUMNS = 80

/**
 * Renders text with fixed options. Animations reuse one Banner so every
 * frame is laid out in the same box, which keeps borders and centering still.
 * A `flowing` banner loops its gradient so `render(text, phase)` can scroll it.
 */
export class Banner {
  readonly font: string
  private readonly options: RenderOptions
  private readonly flowing: boolean
  private bounds: Bounds | undefined
  private extent: Bounds | undefined

  constructor(options: RenderOptions = {}, flowing = false) {
    const { width } = options
    if (width !== undefined && !(Number.isInteger(width) && width > 0)) {
      throw new EchoasciiError(
        `width must be a positive whole number, got ${width}`,
      )
    }
    validateColors(options)
    this.font = resolveFont(options.font ?? DEFAULT_FONT)
    this.options = options
    this.flowing = flowing
  }

  render(text: string, phase = 0): string {
    const { width, border: boxed, markdown: fenced } = this.options
    const trim = Boolean(
      this.options.trim || this.options.center || boxed || fenced,
    )
    const extra = boxed ? 4 : 0

    // Pad with a space on each side of every row
    const padded = ` ${text.split(/\r?\n/).join('\n ')} `
    const layout = {
      font: this.font as FontName,
      horizontalLayout: 'default',
      verticalLayout: 'default',
    } as const
    let lines = figlet.textSync(padded, layout).split('\n')

    // Only wrap when needed, wrapping on spaces changes the padding slightly
    if (width && this.artWidth(lines, trim) + extra > width) {
      lines = figlet
        .textSync(padded, {
          ...layout,
          width: Math.max(1, width - extra),
          whitespaceBreak: true,
        })
        .split('\n')
    }

    if (trim) {
      this.bounds = union(this.bounds, measure(lines))
      const box = this.bounds
      const boxWidth = box ? box.right - box.left : 0
      lines = box ? crop(lines, box) : []
      lines = boxed
        ? border(lines, boxWidth)
        : lines.map((line) => line.trimEnd())
      if (this.options.center) {
        lines = center(lines, boxWidth + extra, width ?? DEFAULT_COLUMNS)
      }
    }

    if (fenced) return markdown(lines).join('\n')
    // Keep gradients spread over everything drawn so far, so a letter keeps
    // its color while the rest is typed out
    this.extent = union(this.extent, measure(lines))
    return colorize(
      lines,
      this.options,
      this.extent,
      this.flowing ? phase : undefined,
    ).join('\n')
  }

  private artWidth(lines: string[], trim: boolean): number {
    if (!trim) return widest(lines)
    const box = measure(lines)
    return box ? box.right - box.left : 0
  }
}
