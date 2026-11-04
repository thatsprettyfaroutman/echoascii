#!/usr/bin/env node
import fs from 'fs'
import path from 'path'
import { parseArgs, type ParseArgsConfig } from 'util'
import {
  clock,
  countdown,
  decode,
  fall,
  loop,
  play,
  SHOW_CURSOR,
  typewriter,
  type Frame,
} from './animate'
import { COLOR_NAMES } from './colors'
import { loadConfig } from './config'
import { EchoasciiError } from './errors'
import { DEFAULT_FONT, listFonts } from './fonts'
import { pick, pickedCommand } from './picker'
import { Banner, fitFont, type RenderOptions } from './render'
import { formatClock, parseDuration } from './time'

const { version } = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'),
) as { version: string }

const OPTIONS = {
  font: { type: 'string', short: 'f' },
  fit: { type: 'boolean' },
  rows: { type: 'boolean' },
  width: { type: 'string', short: 'w' },
  center: { type: 'boolean' },
  border: { type: 'boolean' },
  shadow: { type: 'boolean' },
  fill: { type: 'string' },
  trim: { type: 'boolean' },
  markdown: { type: 'boolean' },
  comment: { type: 'string' },
  color: { type: 'string', short: 'c' },
  gradient: { type: 'string', short: 'g' },
  rainbow: { type: 'boolean' },
  type: { type: 'boolean' },
  decode: { type: 'boolean' },
  fall: { type: 'boolean' },
  flow: { type: 'boolean' },
  wave: { type: 'boolean' },
  marquee: { type: 'boolean' },
  rain: { type: 'boolean' },
  snow: { type: 'boolean' },
  clock: { type: 'boolean' },
  countdown: { type: 'string' },
  pick: { type: 'boolean', short: 'p' },
  random: { type: 'boolean' },
  'list-fonts': { type: 'boolean', short: 'l' },
  help: { type: 'boolean', short: 'h' },
  version: { type: 'boolean', short: 'v' },
} satisfies ParseArgsConfig['options']

const HELP = `Usage: echoascii [options] <text...>

Text:
  -f, --font <name|file>   Font name, or a .flf font file (default: "${DEFAULT_FONT}")
      --fit                Use the biggest font that fits the width
      --rows               Put each argument on its own row
  -w, --width <cols>       Wrap at this many columns (default: terminal width)

Look:
      --center             Center in the terminal
      --border             Draw a box around the banner
      --shadow             Add a drop shadow
      --fill <chars>       Draw the letters with these characters, like # or your text
      --trim               Remove the blank space around the banner
      --markdown           Wrap in a markdown code block, for READMEs
      --comment <lang>     Wrap in code comments, like js, py, sh, css or html

Color:
  -c, --color <color>      A color name, or a hex color like ff8800
  -g, --gradient <colors>  Two or more colors, like red,blue
      --rainbow            Rainbow colors

Animation, starting with one of:
      --type               Type the text out
      --decode             Random characters that settle into the text
      --fall               Letters drop in from the top
and then any of these, until ctrl+c:
      --flow               Make the rainbow or gradient flow
      --wave               Letters bob up and down
      --marquee            Scroll the text sideways across the terminal
      --rain, --snow       Weather around the banner
Or on their own:
      --clock              Show a live clock
      --countdown <time>   Count down, like 90, 5m, 1h30m or 10:00, then show the text

Other:
  -p, --pick               Pick a font with a live preview of your text
      --random             Use a random font
  -l, --list-fonts         List fonts, or preview your text in every font
  -h, --help               Show this help
  -v, --version            Show the version

Colors are ${COLOR_NAMES.join(', ')}.
Text can also be piped in. Defaults can be set in a .echoasciirc file.

Examples:
  echoascii hello world
  echoascii --font Doom --gradient red,blue --border hello
  echoascii --type --flow --font 'ANSI Shadow' hello
  echoascii --decode --wave --rainbow --font Doom hello
  echoascii --comment js --font Small "Section"
  echoascii --countdown 5m "Time's up!"
  echo "piped text" | echoascii --center`

const COLOR_KEYS = ['color', 'rainbow', 'gradient'] as const

const print = (text: string) => process.stdout.write(text + '\n')

const readStdin = async (): Promise<string> => {
  let data = ''
  for await (const chunk of process.stdin) data += chunk
  return data
}

const parseWidth = (value: string): number => {
  const columns = Number(value)
  if (!Number.isInteger(columns) || columns < 1) {
    throw new EchoasciiError(
      `--width must be a positive whole number, got "${value}"`,
    )
  }
  return columns
}

const animate = async (frames: Iterable<Frame>): Promise<void> => {
  const isTTY = Boolean(process.stdout.isTTY)
  if (isTTY) {
    // Bring the cursor back when stopped with ctrl+c
    process.once('SIGINT', () => {
      process.stdout.write(SHOW_CURSOR + '\n')
      process.exit(130)
    })
  }
  await play(frames, { isTTY, write: (text) => process.stdout.write(text) })
}

const main = async (): Promise<void> => {
  const { values, positionals } = parseArgs({
    options: OPTIONS,
    allowPositionals: true,
  })

  if (values.help) return void print(HELP)
  if (values.version) return void print(version)

  const config = loadConfig()
  // A color flag replaces any color setting from the config
  if (COLOR_KEYS.some((key) => values[key] !== undefined)) {
    for (const key of COLOR_KEYS) delete config[key]
  }
  // A solid color can't flow, so --flow replaces it with the rainbow
  if (values.flow) delete config.color
  const merged = { ...config, ...values }
  const isTTY = Boolean(process.stdout.isTTY)

  const options: RenderOptions = {
    font: merged.font,
    fill: merged.fill,
    shadow: merged.shadow,
    comment: merged.comment,
    width:
      values.width !== undefined
        ? parseWidth(values.width)
        : (config.width ?? (isTTY ? process.stdout.columns : undefined)),
    center: merged.center,
    border: merged.border,
    trim: merged.trim,
    markdown: merged.markdown,
    color: merged.color,
    gradient: merged.gradient,
    rainbow: merged.rainbow,
  }

  const timer = values.clock || values.countdown !== undefined
  if (values.clock && values.countdown !== undefined) {
    throw new EchoasciiError('Use either --clock or --countdown, not both')
  }
  const intros = (['type', 'decode', 'fall'] as const).filter(
    (name) => values[name],
  )
  const loops = (['wave', 'marquee', 'rain', 'snow'] as const).filter(
    (name) => values[name],
  )
  if (intros.length > 1) {
    throw new EchoasciiError('Use only one of --type, --decode and --fall')
  }
  if (values.rain && values.snow) {
    throw new EchoasciiError('Use either --rain or --snow, not both')
  }
  if (timer && (intros.length || loops.length)) {
    throw new EchoasciiError(
      "--clock and --countdown can't be combined with other animations, except --flow",
    )
  }
  if (values.marquee && intros.length) {
    throw new EchoasciiError(`--marquee can't follow --${intros[0]}`)
  }
  if (merged.fit && merged.random) {
    throw new EchoasciiError('Use either --fit or --random, not both')
  }
  // The marquee scrolls the whole line instead of wrapping or centering it
  const columns = options.width ?? 80
  if (values.marquee) {
    options.width = undefined
    options.center = false
  }

  if (values.pick && timer) {
    throw new EchoasciiError(
      "--pick shows text, it can't be combined with --clock or --countdown",
    )
  }
  if (values.flow) {
    if (timer) {
      throw new EchoasciiError(
        '--flow works with text, not with --clock or --countdown',
      )
    }
    if (options.color !== undefined) {
      throw new EchoasciiError(
        '--flow needs --rainbow or --gradient, not --color',
      )
    }
    if (options.gradient === undefined) options.rainbow = true
  }

  // Text comes from the arguments, or stdin when something is piped in
  let text = ''
  if (positionals.length) {
    text = (merged.rows ? positionals : [positionals.join(' ')]).join('\n')
  } else if (!process.stdin.isTTY && !timer) {
    text = (await readStdin()).trimEnd()
  }
  const hasText = text.trim() !== ''

  if (values['list-fonts']) {
    if (!hasText) return void print(listFonts().join('\n'))
    for (const font of listFonts()) {
      print(`${font}\n${new Banner({ ...options, font }).render(text)}\n`)
    }
    return
  }

  if (values.pick) {
    if (!process.stdin.isTTY || !isTTY) {
      throw new EchoasciiError('--pick needs a terminal to show the fonts in')
    }
    const shown = hasText ? text : 'echoascii'
    const font = await pick(shown, options)
    if (!font) {
      process.exitCode = 130
      return
    }
    print(new Banner({ ...options, font }).render(shown))
    process.stderr.write(
      `\nUse it again with: ${pickedCommand(process.argv.slice(2), font)}\n`,
    )
    return
  }

  if (!hasText && !timer) {
    process.stderr.write(HELP + '\n')
    process.exitCode = 1
    return
  }

  if (merged.random) {
    const fonts = listFonts()
    options.font = fonts[Math.floor(Math.random() * fonts.length)]
    process.stderr.write(`font: ${options.font}\n`)
  }
  if (merged.fit) {
    options.font = fitFont(timer ? '00:00:00' : text, options, columns)
    process.stderr.write(`font: ${options.font}\n`)
  }
  const flowing = Boolean(values.flow) && isTTY
  const banner = new Banner(options, flowing)

  if (values.clock) {
    if (hasText) {
      throw new EchoasciiError('--clock shows the time, so it takes no text')
    }
    // Without a terminal to redraw in, print the time once
    if (!isTTY) return void print(banner.render(formatClock(new Date())))
    return animate(clock(banner))
  }

  if (values.countdown !== undefined) {
    const duration = parseDuration(values.countdown)
    await animate(countdown(banner, duration, hasText ? text : undefined))
    if (isTTY) process.stdout.write('\x07')
    return
  }

  // An intro plays once, then the loops run together until ctrl+c. Without a
  // terminal to animate in, the banner is just printed.
  if (isTTY && (intros.length || loops.length || flowing)) {
    return animate(
      (function* () {
        if (values.type) yield* typewriter(banner, text)
        if (values.decode) yield* decode(banner, text)
        if (values.fall) yield* fall(banner, text)
        if (loops.length || flowing) {
          yield* loop(banner, text, {
            flow: flowing,
            wave: values.wave,
            marquee: values.marquee,
            rain: values.rain,
            snow: values.snow,
            columns,
          })
        }
      })(),
    )
  }

  print(banner.render(text))
}

// Exit quietly when piped into something that stops reading, like head
process.stdout.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code !== 'EPIPE') throw error
  process.exit(0)
})

main().catch((error: unknown) => {
  const code = (error as { code?: unknown })?.code
  if (typeof code !== 'string') throw error
  let message = (error as Error).message
  if (code.startsWith('ERR_PARSE_ARGS')) {
    message += '\nRun "echoascii --help" to see all options.'
  } else if (code === 'UNKNOWN_FONT') {
    message += '\nRun "echoascii --list-fonts" to see them all.'
  } else if (!(error instanceof EchoasciiError)) {
    throw error
  }
  process.stderr.write(`echoascii: ${message}\n`)
  process.exitCode = 1
})
