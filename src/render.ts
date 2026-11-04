import figlet, { type FontName } from 'figlet'
import { plain, SHADOW, withoutSpecials } from './cells'
import {
  colorize,
  validateColors,
  type ColorOptions,
  type PaintOptions,
} from './colors'
import { EchoasciiError } from './errors'
import { DEFAULT_FONT, resolveFont } from './fonts'
import {
  border,
  center,
  comment,
  commentStyle,
  crop,
  fill,
  markdown,
  measure,
  shadow,
  union,
  widest,
  type Bounds,
} from './layout'

export interface RenderOptions extends ColorOptions {
  /**
   * Font name. Case, spaces and dashes don't matter. Can also be a path to a
   * .flf font file. Defaults to "Larry 3D".
   */
  font?: string
  /** Wrap at this many columns. Also the width that `center` centers in. */
  width?: number
  /** Center the banner within `width`, or 80 columns */
  center?: boolean
  /** Remove the blank space around the banner */
  trim?: boolean
  /** Draw a box around the banner */
  border?: boolean
  /** Draw the letters with these characters instead, taking turns */
  fill?: string
  /** Add a drop shadow, one cell down and to the right */
  shadow?: boolean
  /** Wrap the banner in a markdown code block. Implies `trim`, skips colors. */
  markdown?: boolean
  /**
   * Wrap the banner in code comments for a language like "js", "py" or
   * "html", or a marker like "//". Implies `trim`, skips colors.
   */
  comment?: string
}

const DEFAULT_COLUMNS = 80

/**
 * Renders text with fixed options. It works in three steps, so animations
 * can change the letters between them:
 *
 * - `art` draws the letters, filled and shadowed, cropped when trimming
 * - `frame` adds the border and centering
 * - `paint` adds colors, or formats it as markdown or comments
 *
 * Animations reuse one Banner so every frame is laid out in the same box,
 * which keeps borders and centering still. A `flowing` banner loops its
 * gradient, so `paint` can scroll it with a `phase`.
 */
export class Banner {
  readonly font: string
  readonly options: RenderOptions
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
    if (options.fill !== undefined && !options.fill.replace(/\s/g, '')) {
      throw new EchoasciiError('fill needs at least one character')
    }
    if (options.comment !== undefined) {
      if (options.markdown) {
        throw new EchoasciiError('Use either markdown or comment, not both')
      }
      commentStyle(options.comment)
    }
    this.font = resolveFont(options.font ?? DEFAULT_FONT)
    this.options = options
    this.flowing = flowing
  }

  private get trimming(): boolean {
    const { trim, center, border, markdown, comment } = this.options
    return Boolean(trim || center || border || markdown || comment)
  }

  /** The letters, without border, centering or colors */
  art(text: string): string[] {
    const { width, border: boxed } = this.options
    const extra = (boxed ? 4 : 0) + (this.options.shadow ? 1 : 0)

    // Pad with a space on each side of every row
    const padded = ` ${text.split(/\r?\n/).join('\n ')} `
    const layout = {
      font: this.font as FontName,
      horizontalLayout: 'default',
      verticalLayout: 'default',
    } as const
    let lines = figlet.textSync(padded, layout).split('\n')

    // Only wrap when needed, wrapping on spaces changes the padding slightly
    if (width && this.artWidth(lines) + extra > width) {
      lines = figlet
        .textSync(padded, {
          ...layout,
          width: Math.max(1, width - extra),
          whitespaceBreak: true,
        })
        .split('\n')
    }

    if (this.options.fill !== undefined) lines = fill(lines, this.options.fill)
    if (this.options.shadow) lines = shadow(lines, SHADOW)

    if (this.trimming) {
      this.bounds = union(this.bounds, measure(lines))
      lines = this.bounds ? crop(lines, this.bounds) : []
      if (!boxed) lines = lines.map((line) => line.trimEnd())
    }
    return lines
  }

  /** Adds the border and centering. `width` is the box size inside the border. */
  frame(lines: string[], width = this.boxWidth(lines)): string[] {
    if (!this.trimming) return lines
    const { border: boxed } = this.options
    if (boxed) lines = border(lines, width)
    if (this.options.center) {
      lines = center(
        lines,
        width + (boxed ? 4 : 0),
        this.options.width ?? DEFAULT_COLUMNS,
      )
    }
    return lines
  }

  /** Adds colors, or formats the lines as markdown or comments */
  paint(lines: string[], { phase = 0, origin, extent }: PaintOptions = {}) {
    if (this.options.markdown) return markdown(lines.map(plain)).join('\n')
    if (this.options.comment !== undefined) {
      return comment(lines.map(plain), this.options.comment).join('\n')
    }
    // Keep gradients spread over everything drawn so far, so a letter keeps
    // its color while the rest is typed out
    this.extent = union(this.extent, measure(lines.map(withoutSpecials)))
    return colorize(lines, this.options, {
      extent: extent ?? this.extent,
      phase: this.flowing ? phase : undefined,
      origin,
    }).join('\n')
  }

  render(text: string, phase = 0): string {
    return this.paint(this.frame(this.art(text)), { phase })
  }

  // The widest the art has been, so the box only ever grows
  private boxWidth(lines: string[]): number {
    const box = this.bounds ? this.bounds.right - this.bounds.left : 0
    return Math.max(box, widest(lines))
  }

  private artWidth(lines: string[]): number {
    if (!this.trimming) return widest(lines)
    const box = measure(lines)
    return box ? box.right - box.left : 0
  }
}

// Big to small, and all easy to read
const FIT_FONTS = [
  'Larry 3D',
  'ANSI Shadow',
  'Big',
  'Standard',
  'Small',
  'Mini',
]

/**
 * The biggest font that fits the text in `columns` without wrapping. Starts
 * with `options.font` when there is one.
 */
export const fitFont = (
  text: string,
  options: RenderOptions,
  columns: number,
): string => {
  const first = options.font === undefined ? [] : [resolveFont(options.font)]
  const fonts = [...new Set([...first, ...FIT_FONTS])]
  for (const font of fonts) {
    const banner = new Banner({
      ...options,
      font,
      width: undefined,
      center: false,
      color: undefined,
      gradient: undefined,
      rainbow: undefined,
    })
    if (widest(banner.frame(banner.art(text))) <= columns) return font
  }
  return fonts.at(-1)!
}
