import figlet, { type FontName } from 'figlet'
import fs from 'fs'
import path from 'path'
import { EchoasciiError } from './errors'

// Only ever use the fonts bundled with figlet, never fetch them
figlet.defaults({ fetchFontIfMissing: false })

export const DEFAULT_FONT = 'Larry 3D'

let fonts: string[] | undefined

/** Names of all bundled fonts */
export const listFonts = (): string[] => [...(fonts ??= figlet.fontsSync())]

// "ANSI Shadow", "ansi-shadow" and "ansishadow" all match
const normalize = (name: string) => name.toLowerCase().replace(/[\s_-]/g, '')

const distance = (a: string, b: string): number => {
  let previous = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    const row = [i]
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      row[j] = Math.min(
        (previous[j] ?? 0) + 1,
        (row[j - 1] ?? 0) + 1,
        (previous[j - 1] ?? 0) + cost,
      )
    }
    previous = row
  }
  return previous[b.length] ?? 0
}

export const findFont = (name: string, fonts: string[]): string | undefined =>
  fonts.find((font) => font === name) ??
  fonts.find((font) => normalize(font) === normalize(name))

// Fonts containing the name come first, then the closest misspellings
export const suggestFonts = (
  name: string,
  fonts: string[],
  limit = 3,
): string[] => {
  const query = normalize(name)
  const maxDistance = Math.max(1, Math.floor(query.length / 3))
  return fonts
    .map((font) => {
      const key = normalize(font)
      const contains = query.length > 0 && key.includes(query)
      return {
        font,
        score: contains ? 0 : distance(query, key),
        size: key.length,
      }
    })
    .filter(({ score }) => score <= maxDistance)
    .sort((a, b) => a.score - b.score || a.size - b.size)
    .slice(0, limit)
    .map(({ font }) => font)
}

// Font files are read once and registered under their full path
const files = new Set<string>()

const isFontFile = (name: string) =>
  /\.[ft]lf$/i.test(name) || name.includes('/') || name.includes('\\')

const loadFontFile = (name: string): string => {
  const file = path.resolve(name)
  if (files.has(file)) return file
  let data: string
  try {
    data = fs.readFileSync(file, 'utf8')
  } catch (error) {
    throw new EchoasciiError(
      `Could not read the font file ${name}: ${(error as Error).message}`,
    )
  }
  try {
    figlet.parseFont(file as FontName, data)
  } catch {
    throw new EchoasciiError(`${name} isn't a FIGlet font`)
  }
  files.add(file)
  return file
}

export const resolveFont = (name: string): string => {
  if (isFontFile(name)) return loadFontFile(name)
  const font = findFont(name, listFonts())
  if (font) return font
  const suggestions = suggestFonts(name, listFonts()).map((s) => `"${s}"`)
  throw new EchoasciiError(
    `Unknown font "${name}".` +
      (suggestions.length ? ` Did you mean ${suggestions.join(', ')}?` : ''),
    'UNKNOWN_FONT',
  )
}
