#!/usr/bin/env node
const { parseArgs } = require('util')
const figlet = require('figlet')
const { loadConfig } = require('../lib/config')
const { findFont, suggestFonts } = require('../lib/fonts')
const { COLORS, color, rainbow } = require('../lib/colors')
const { version } = require('../package.json')

// Only ever use the fonts bundled with figlet, never fetch them
figlet.defaults({ fetchFontIfMissing: false })

const DEFAULT_FONT = 'Larry 3D'

const OPTIONS = {
  font: { type: 'string', short: 'f' },
  rows: { type: 'boolean' },
  width: { type: 'string', short: 'w' },
  color: { type: 'string', short: 'c' },
  rainbow: { type: 'boolean' },
  random: { type: 'boolean' },
  'list-fonts': { type: 'boolean', short: 'l' },
  help: { type: 'boolean', short: 'h' },
  version: { type: 'boolean', short: 'v' },
}

const HELP = `
Usage: echoascii [options] <text...>

Options:
  -f, --font <name>    Font to use (default: "${DEFAULT_FONT}")
      --rows           Put each argument on its own row
  -w, --width <cols>   Wrap at this many columns (default: terminal width)
  -c, --color <name>   Color: ${Object.keys(COLORS).join(', ')}
      --rainbow        Rainbow colors
      --random         Use a random font
  -l, --list-fonts     List fonts, or preview your text in every font
  -h, --help           Show this help
  -v, --version        Show the version

Text can also be piped in. Defaults can be set in a .echoasciirc file.

Examples:
  echoascii hello world
  echoascii --font Doom --rainbow hello
  echo "piped text" | echoascii --rows
  echoascii --list-fonts hi | less
`

class UserError extends Error {}

const print = (text) => process.stdout.write(text + '\n')

const readStdin = async () => {
  let data = ''
  for await (const chunk of process.stdin) data += chunk
  return data
}

const widest = (art) =>
  Math.max(...art.split('\n').map((line) => [...line].length))

const resolveFont = (name, fonts) => {
  const font = findFont(name, fonts)
  if (font) return font
  const suggestions = suggestFonts(name, fonts).map((s) => `"${s}"`)
  throw new UserError(
    `Unknown font "${name}".` +
      (suggestions.length ? ` Did you mean ${suggestions.join(', ')}?` : '') +
      '\nRun "echoascii --list-fonts" to see them all.',
  )
}

const resolveWidth = (width) => {
  if (width === undefined) return process.stdout.columns
  const columns = Number(width)
  if (!Number.isInteger(columns) || columns < 1) {
    throw new UserError(
      `--width must be a positive whole number, got "${width}"`,
    )
  }
  return columns
}

const main = async () => {
  const { values, positionals } = parseArgs({
    options: OPTIONS,
    allowPositionals: true,
  })

  if (values.help) return print(HELP.trim())
  if (values.version) return print(version)

  let config
  try {
    config = loadConfig()
  } catch (error) {
    throw new UserError(error.message)
  }
  const options = { font: DEFAULT_FONT, ...config, ...values }
  options.color = options.color?.toLowerCase()
  const fonts = figlet.fontsSync()
  const width = resolveWidth(options.width)

  if (options.color && !COLORS[options.color]) {
    throw new UserError(
      `Unknown color "${options.color}". Use one of: ${Object.keys(COLORS).join(', ')}`,
    )
  }

  // Text comes from the arguments, or stdin when something is piped in
  let rows = []
  if (positionals.length) {
    rows = options.rows ? positionals : [positionals.join(' ')]
  } else if (!process.stdin.isTTY) {
    rows = [(await readStdin()).trimEnd()]
  }
  rows = rows.flatMap((row) => row.split(/\r?\n/))
  const hasText = rows.some((row) => row.trim())

  // Pad with a space on each side of every row
  const text = ` ${rows.join('\n ')} `

  const render = (font) => {
    const layout = {
      font,
      horizontalLayout: 'default',
      verticalLayout: 'default',
    }
    let art = figlet.textSync(text, layout)
    // Only wrap when needed, wrapping on spaces changes the padding slightly
    if (width && widest(art) > width) {
      art = figlet.textSync(text, { ...layout, width, whitespaceBreak: true })
    }
    if (options.rainbow) return rainbow(art)
    if (options.color) return color(art, options.color)
    return art
  }

  if (values['list-fonts']) {
    if (!hasText) return print(fonts.join('\n'))
    for (const font of fonts) print(`${font}\n${render(font)}\n`)
    return
  }

  if (!hasText) {
    process.stderr.write(HELP.trim() + '\n')
    process.exitCode = 1
    return
  }

  let font
  if (options.random) {
    font = fonts[Math.floor(Math.random() * fonts.length)]
    process.stderr.write(`font: ${font}\n`)
  } else {
    font = resolveFont(options.font, fonts)
  }

  print(render(font))
}

// Exit quietly when piped into something that stops reading, like head
process.stdout.on('error', (error) => {
  if (error.code !== 'EPIPE') throw error
  process.exit(0)
})

main().catch((error) => {
  if (error.code?.startsWith('ERR_PARSE_ARGS')) {
    error.message += '\nRun "echoascii --help" to see all options.'
  } else if (!(error instanceof UserError)) {
    throw error
  }
  process.stderr.write(`echoascii: ${error.message}\n`)
  process.exitCode = 1
})
