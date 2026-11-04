import { COLOR_NAMES, type ColorName as Color } from './colors'
import { EchoasciiError as ErrorClass } from './errors'
import { listFonts } from './fonts'
import { Banner, fitFont, type RenderOptions } from './render'

/**
 * Renders text as an ASCII art banner. Rows are split on newlines.
 *
 * @example
 * echoascii('hello')
 * echoascii('hello', { font: 'ANSI Shadow', border: true, gradient: 'red,blue' })
 */
function echoascii(text: string, options: echoascii.Options = {}): string {
  const shown = String(text)
  const font = options.fit
    ? fitFont(shown, options, options.width ?? 80)
    : options.font
  return new Banner({ ...options, font }).render(shown)
}

declare namespace echoascii {
  /** Options for {@link echoascii} */
  export type Options = RenderOptions & {
    /** Use the biggest font that fits `width`, or 80 columns, starting with `font` */
    fit?: boolean
  }
  /** Color names that work for `color` and `gradient` */
  export type ColorName = Color
  /** Thrown for bad input, like an unknown font or color */
  export type EchoasciiError = ErrorClass
  export var EchoasciiError: typeof ErrorClass
  /** Names of all bundled fonts */
  export var fonts: () => string[]
  /** Color names that work for `color` and `gradient` */
  export var colors: Color[]
}

// Declared above instead of inferred, because TypeScript 7 drops the export
// from inferred members when there's also a default
echoascii.fonts = () => listFonts()
echoascii.colors = [...COLOR_NAMES]
echoascii.EchoasciiError = ErrorClass

// Makes `import echoascii from 'echoascii'` work in every TypeScript setup
echoascii.default = echoascii

export = echoascii
