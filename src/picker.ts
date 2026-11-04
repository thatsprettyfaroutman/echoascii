import { HIDE_CURSOR, SHOW_CURSOR, SYNC_END, SYNC_START } from './animate'
import { DEFAULT_FONT, findFont, listFonts } from './fonts'
import { Banner, type RenderOptions } from './render'

export type Key =
  | 'up'
  | 'down'
  | 'pageup'
  | 'pagedown'
  | 'home'
  | 'end'
  | 'enter'
  | 'escape'
  | 'backspace'
  | 'clear'
  | 'cancel'
  | { text: string }

export interface PickerState {
  fonts: string[]
  query: string
  /** The highlighted font */
  font: string
}

export type Result =
  | { state: PickerState; done?: undefined }
  | { state: PickerState; done: 'pick' | 'cancel' }

const SEQUENCES: [string, Key][] = [
  ['\x1b[A', 'up'],
  ['\x1b[B', 'down'],
  ['\x1b[C', 'down'],
  ['\x1b[D', 'up'],
  ['\x1bOA', 'up'],
  ['\x1bOB', 'down'],
  ['\x1bOC', 'down'],
  ['\x1bOD', 'up'],
  ['\x1b[5~', 'pageup'],
  ['\x1b[6~', 'pagedown'],
  ['\x1b[H', 'home'],
  ['\x1b[1~', 'home'],
  ['\x1bOH', 'home'],
  ['\x1b[F', 'end'],
  ['\x1b[4~', 'end'],
  ['\x1bOF', 'end'],
]

/** Turns raw terminal input into keys. Typed characters are joined up. */
export const parseKeys = (data: string): Key[] => {
  const keys: Key[] = []
  let rest = data
  const type = (text: string) => {
    const last = keys.at(-1)
    if (typeof last === 'object') last.text += text
    else keys.push({ text })
  }
  while (rest) {
    const sequence = SEQUENCES.find(([start]) => rest.startsWith(start))
    if (sequence) {
      keys.push(sequence[1])
      rest = rest.slice(sequence[0].length)
      continue
    }
    const char = [...rest][0]!
    rest = rest.slice(char.length)
    if (char === '\r' || char === '\n') keys.push('enter')
    else if (char === '\x03') keys.push('cancel')
    else if (char === '\x15') keys.push('clear')
    else if (char === '\x7f' || char === '\b') keys.push('backspace')
    else if (char === '\x1b') {
      // An escape on its own, or the start of a sequence we don't use
      const unknown = rest.match(/^(\[[\d;]*[~A-Za-z]|O[A-Za-z])/)
      if (unknown) rest = rest.slice(unknown[0].length)
      else keys.push('escape')
    } else if (char >= ' ') type(char)
  }
  return keys
}

const normalize = (name: string) => name.toLowerCase().replace(/[\s_-]/g, '')

export const matching = (state: PickerState): string[] => {
  const query = normalize(state.query)
  return state.fonts.filter((font) => normalize(font).includes(query))
}

// Keeps the highlighted font when it still matches the search
const search = (state: PickerState, query: string): PickerState => {
  const next = { ...state, query }
  const fonts = matching(next)
  return {
    ...next,
    font: fonts.includes(state.font) ? state.font : (fonts[0] ?? state.font),
  }
}

export const reduce = (state: PickerState, key: Key): Result => {
  if (typeof key === 'object')
    return { state: search(state, state.query + key.text) }
  if (key === 'backspace') {
    return { state: search(state, [...state.query].slice(0, -1).join('')) }
  }
  if (key === 'clear') return { state: search(state, '') }
  if (key === 'cancel') return { state, done: 'cancel' }
  // Escape clears the search first, then leaves
  if (key === 'escape') {
    return state.query
      ? { state: search(state, '') }
      : { state, done: 'cancel' }
  }

  const fonts = matching(state)
  if (!fonts.length) return { state }
  if (key === 'enter') return { state, done: 'pick' }

  const index = Math.max(0, fonts.indexOf(state.font))
  const last = fonts.length - 1
  const moves: Record<typeof key, number> = {
    up: index === 0 ? last : index - 1,
    down: index === last ? 0 : index + 1,
    pageup: Math.max(0, index - 10),
    pagedown: Math.min(last, index + 10),
    home: 0,
    end: last,
  }
  return { state: { ...state, font: fonts[moves[key]]! } }
}

const DIM = '\x1b[2m'
const BOLD = '\x1b[1m'
const RESET = '\x1b[0m'

const fit = (text: string, columns: number) =>
  [...text].slice(0, Math.max(0, columns)).join('')

/** The whole picker screen, one string per row */
export const view = (
  state: PickerState,
  text: string,
  options: RenderOptions,
  columns: number,
  rows: number,
): string[] => {
  const fonts = matching(state)
  const position = `${fonts.indexOf(state.font) + 1} / ${fonts.length}`
  const title = ' echoascii font picker'
  const header =
    BOLD +
    title +
    RESET +
    ' '.repeat(Math.max(1, columns - title.length - position.length - 1)) +
    DIM +
    position +
    RESET
  const searchLine = state.query
    ? fit(` Search: ${state.query}`, columns)
    : DIM + fit(' Type to search', columns) + RESET
  const help = `${DIM}${fit(' ↑↓ browse · type to search · enter picks · esc cancels', columns)}${RESET}`

  const screen = [header, searchLine, DIM + '─'.repeat(columns) + RESET]
  const room = Math.max(1, rows - screen.length - 3)
  if (!fonts.length) {
    screen.push('', ` No fonts match "${state.query}"`)
  } else {
    screen.push(` ${BOLD}${fit(state.font, columns - 1)}${RESET}`)
    const art = new Banner({ ...options, font: state.font, width: columns - 1 })
      .render(text)
      .split('\n')
    screen.push(...art.slice(0, room))
  }
  while (screen.length < rows - 1) screen.push('')
  return [...screen.slice(0, rows - 1), help]
}

export interface Terminal {
  stdin: NodeJS.ReadStream
  stdout: NodeJS.WriteStream
}

/**
 * Shows the picker until a font is picked or it's cancelled. Runs on the
 * terminal's alternate screen, so the scrollback is left as it was.
 */
export const pick = (
  text: string,
  options: RenderOptions,
  { stdin, stdout }: Terminal = {
    stdin: process.stdin,
    stdout: process.stdout,
  },
): Promise<string | undefined> =>
  new Promise((resolve) => {
    const fonts = listFonts()
    let state: PickerState = {
      fonts,
      query: '',
      font: findFont(options.font ?? DEFAULT_FONT, fonts) ?? fonts[0]!,
    }

    const draw = () => {
      const lines = view(
        state,
        text,
        options,
        stdout.columns || 80,
        stdout.rows || 24,
      )
      // Draw over the last screen instead of clearing it, so it never blinks
      stdout.write(
        SYNC_START +
          '\x1b[H' +
          lines.map((line) => line + '\x1b[K').join('\r\n') +
          '\x1b[J' +
          SYNC_END,
      )
    }

    const finish = (font?: string) => {
      stdin.off('data', onData)
      stdout.off('resize', draw)
      stdin.setRawMode(false)
      stdin.pause()
      stdout.write(SHOW_CURSOR + '\x1b[?1049l')
      resolve(font)
    }

    const onData = (data: string) => {
      for (const key of parseKeys(data)) {
        const result = reduce(state, key)
        state = result.state
        if (result.done)
          return finish(result.done === 'pick' ? state.font : undefined)
      }
      draw()
    }

    stdout.write('\x1b[?1049h' + HIDE_CURSOR)
    stdin.setRawMode(true)
    stdin.setEncoding('utf8')
    stdin.on('data', onData)
    stdin.resume()
    stdout.on('resize', draw)
    draw()
  })

// Quotes a word for the shell only when it needs it
const quote = (word: string) =>
  /^[\w@%+=:,./-]+$/.test(word) ? word : `'${word.replace(/'/g, `'\\''`)}'`

/** The command that prints the picked font, keeping the other options */
export const pickedCommand = (args: string[], font: string): string => {
  const kept: string[] = []
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!
    if (arg === '--pick' || arg === '-p') continue
    if (arg === '--font' || arg === '-f') {
      i++
      continue
    }
    if (arg.startsWith('--font=') || (arg.startsWith('-f') && arg.length > 2))
      continue
    kept.push(arg)
  }
  return ['echoascii', '--font', font, ...kept].map(quote).join(' ')
}
