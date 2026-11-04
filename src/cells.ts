// Placeholder characters that layout carries along untouched and that get
// their own look when painted: drop shadows, and rain and snow around a
// banner. They're private use characters, so no font draws them.
export const SHADOW = '\uE000'
export const RAIN = '\uE001'
export const SNOW = '\uE002'
export const FLAKE = '\uE003'

export const SPECIALS: Record<string, { char: string; code: string }> = {
  [SHADOW]: { char: '░', code: '\x1b[90m' },
  [RAIN]: { char: '|', code: '\x1b[34m' },
  [SNOW]: { char: '*', code: '\x1b[37m' },
  [FLAKE]: { char: '.', code: '\x1b[90m' },
}

const PLACEHOLDERS = /[\uE000-\uE003]/g

/** Swaps placeholders for the characters they stand for */
export const plain = (line: string): string =>
  line.replace(PLACEHOLDERS, (char) => SPECIALS[char]!.char)

/** Blanks out placeholders, to measure only the art itself */
export const withoutSpecials = (line: string): string =>
  line.replace(PLACEHOLDERS, ' ')
