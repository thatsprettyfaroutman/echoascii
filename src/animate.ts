import { FLAKE, RAIN, SNOW, SPECIALS, withoutSpecials } from './cells'
import { measure, widest } from './layout'
import type { Banner } from './render'
import { formatClock, formatCountdown } from './time'

export interface Frame {
  text: string
  /** How long to show this frame, in ms */
  hold: number
}

export interface Screen {
  isTTY: boolean
  write(text: string): void
}

export const HIDE_CURSOR = '\x1b[?25l'
export const SHOW_CURSOR = '\x1b[?25h'
// Terminals that support synchronized output show everything between these
// at once, the rest ignore them
export const SYNC_START = '\x1b[?2026h'
export const SYNC_END = '\x1b[?2026l'

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// Wake up just after each second ticks over, so a timer that fires a
// millisecond early never shows the same second twice
const AFTER_TICK = 10

/**
 * Draws each frame over the previous one. Without a terminal the frames are
 * just printed one after another.
 */
export const play = async (
  frames: Iterable<Frame>,
  screen: Screen,
  sleep: (ms: number) => Promise<unknown> = wait,
): Promise<void> => {
  let height = 0
  // Leave an empty row between the command and the animation
  if (screen.isTTY) screen.write(HIDE_CURSOR + '\n')
  try {
    for (const frame of frames) {
      const lines = frame.text.split('\n')
      if (screen.isTTY) {
        // Draw over the previous frame line by line instead of clearing it
        // first, so a frame that arrives in pieces never blinks. Then clear
        // whatever is left below, in case the new frame is shorter.
        const back = height ? `\x1b[${height}F` : ''
        const body = lines.map((line) => line + '\x1b[K').join('\n')
        screen.write(SYNC_START + back + body + '\n\x1b[J' + SYNC_END)
      } else {
        screen.write(frame.text + '\n')
      }
      height = lines.length
      if (frame.hold > 0) await sleep(frame.hold)
    }
  } finally {
    if (screen.isTTY) screen.write(SHOW_CURSOR)
  }
}

type Random = () => number

const FPS = 20
const FRAME = 1000 / FPS

const chars = (line: string) => [...line]

const blank = (width: number) => Array<string>(width).fill(' ')

/**
 * When each cell first shows up while the text is typed, numbered per
 * letter. Lets letters move as one, even though fonts squeeze them together.
 */
const letterOrder = (banner: Banner, text: string): Map<string, number> => {
  const order = new Map<string, number>()
  const letters = [...text]
  let letter = 0
  for (let i = 1; i <= letters.length; i++) {
    if (i < letters.length && !letters[i - 1]?.trim()) continue
    banner.art(letters.slice(0, i).join('')).forEach((line, y) =>
      chars(line).forEach((char, x) => {
        const key = `${x},${y}`
        if (char !== ' ' && !order.has(key)) order.set(key, letter)
      }),
    )
    letter++
  }
  return order
}

const NOISE = '!#$%&*+=?@^~<>/|{}[]0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'

/** Random characters that settle into the banner, mostly left to right */
export function* decode(
  banner: Banner,
  text: string,
  random: Random = Math.random,
  frames = 30,
): Generator<Frame> {
  const art = banner.art(text)
  const width = Math.max(1, widest(art))
  // When each cell settles, between 0 and 1
  const settles = art.map((line) =>
    chars(line).map((_, x) => 0.65 * (x / width) + 0.35 * random()),
  )
  for (let i = 1; i <= frames; i++) {
    const progress = i / frames
    const lines = art.map((line, y) =>
      chars(line)
        .map((char, x) =>
          char === ' ' || SPECIALS[char] || settles[y]![x]! <= progress
            ? char
            : NOISE[Math.floor(random() * NOISE.length)]!,
        )
        .join(''),
    )
    yield {
      text: banner.paint(banner.frame(lines)),
      hold: i < frames ? FRAME : 0,
    }
  }
}

// Eases from 0 to 1 and bounces at the end, like something landing
const bounce = (t: number): number => {
  if (t < 1 / 2.75) return 7.5625 * t * t
  if (t < 2 / 2.75) return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75
  if (t < 2.5 / 2.75) return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375
  return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375
}

/** Letters drop in from the top one after another, and bounce as they land */
export function* fall(banner: Banner, text: string): Generator<Frame> {
  const art = banner.art(text)
  const order = letterOrder(banner, text)
  const width = widest(art)
  const height = art.length
  const gap = 2
  const drop = 12
  const total = Math.max(0, ...order.values()) * gap + drop
  for (let frame = 1; frame < total; frame++) {
    const grid = art.map(() => blank(width))
    art.forEach((line, y) =>
      chars(line).forEach((char, x) => {
        if (char === ' ') return
        const t = (frame - (order.get(`${x},${y}`) ?? 0) * gap) / drop
        if (t <= 0) return
        const row = y - Math.round((1 - bounce(Math.min(1, t))) * height)
        if (row >= 0) grid[row]![x] = char
      }),
    )
    yield {
      text: banner.paint(banner.frame(grid.map((row) => row.join('')))),
      hold: FRAME,
    }
  }
  yield { text: banner.paint(banner.frame(art)), hold: 0 }
}

/** What a looping animation does, any mix of these */
export interface LoopEffects {
  /** Flowing colors, for a banner made with `flowing` */
  flow?: boolean
  /** Letters bob up and down in a wave */
  wave?: boolean
  /** The text scrolls sideways through a window as wide as `columns` */
  marquee?: boolean
  rain?: boolean
  snow?: boolean
  /** The terminal width, for the marquee and the weather */
  columns?: number
}

const WAVE_LENGTH = 24
const WAVE_FRAMES = 24

// Moves each column up or down along a sine wave
const wave = (lines: string[], t: number, amplitude: number): string[] => {
  const grid = lines.map(chars)
  const width = widest(lines)
  const rows = Array.from({ length: lines.length + amplitude * 2 }, () =>
    blank(width),
  )
  for (let x = 0; x < width; x++) {
    const shift = Math.round(
      amplitude * Math.sin(2 * Math.PI * (x / WAVE_LENGTH - t / WAVE_FRAMES)),
    )
    grid.forEach((row, y) => {
      const char = row[x]
      if (char && char !== ' ') rows[y + amplitude + shift]![x] = char
    })
  }
  return rows.map((row) => row.join(''))
}

interface Particle {
  x: number
  y: number
  speed: number
  drift: number
  mark: string
}

// Rows of sky above and below the banner for the weather to fall through
const SKY_ABOVE = 2
const SKY_BELOW = 1

const weather = (
  count: number,
  width: number,
  height: number,
  snow: boolean,
  random: Random,
): Particle[] =>
  Array.from({ length: count }, () => ({
    x: random() * width,
    y: random() * height,
    speed: snow ? 0.12 + random() * 0.2 : 0.7 + random() * 0.6,
    drift: snow ? (random() - 0.5) * 0.3 : 0,
    mark: snow ? (random() < 0.5 ? SNOW : FLAKE) : RAIN,
  }))

// Moves the drops or flakes along and draws them behind the letters
const fallThrough = (
  lines: string[],
  particles: Particle[],
  width: number,
  random: Random,
): string[] => {
  const rows = [
    ...Array.from({ length: SKY_ABOVE }, () => blank(width)),
    ...lines.map((line) => {
      const row = chars(line)
      return [...row, ...blank(width - row.length)]
    }),
    ...Array.from({ length: SKY_BELOW }, () => blank(width)),
  ]
  for (const particle of particles) {
    particle.y += particle.speed
    particle.x += particle.drift
    if (particle.y >= rows.length) {
      particle.y -= rows.length
      particle.x = random() * width
    }
    particle.x = ((particle.x % width) + width) % width
    const row = rows[Math.floor(particle.y)]
    const x = Math.floor(particle.x)
    if (row?.[x] === ' ') row[x] = particle.mark
  }
  return rows.map((row) => row.join(''))
}

/** Flowing colors, waves, a marquee or weather, any mix, until stopped */
export function* loop(
  banner: Banner,
  text: string,
  effects: LoopEffects,
  random: Random = Math.random,
): Generator<Frame> {
  const art = banner.art(text)
  const artWidth = widest(art)
  const columns = effects.columns ?? 80
  const view = Math.max(1, columns - (banner.options.border ? 4 : 0))
  const amplitude = effects.wave ? (art.length > 6 ? 2 : 1) : 0
  const extent = measure(art.map(withoutSpecials))
  let particles: Particle[] | undefined

  for (let t = 0; ; t++) {
    let lines = art
    let origin: { x: number; y: number } | undefined
    if (effects.marquee) {
      // Starts just off the right edge and scrolls until it's gone
      const offset = (t % (artWidth + view)) - view
      lines = art.map((line) => {
        const row = chars(line)
        return Array.from(
          { length: view },
          (_, i) => row[offset + i] ?? ' ',
        ).join('')
      })
      origin = { x: offset, y: 0 }
    }
    if (amplitude) lines = wave(lines, t, amplitude)
    lines = banner.frame(lines, effects.marquee ? view : undefined)
    if (effects.rain || effects.snow) {
      const width = Math.max(columns, widest(lines))
      const height = lines.length + SKY_ABOVE + SKY_BELOW
      particles ??= weather(
        Math.round(width * height * (effects.snow ? 0.03 : 0.05)),
        width,
        height,
        Boolean(effects.snow),
        random,
      )
      lines = fallThrough(lines, particles, width, random)
    }
    yield {
      text: banner.paint(lines, {
        phase: t,
        origin,
        extent: effects.marquee ? extent : undefined,
      }),
      hold: FRAME,
    }
  }
}

/** Scrolls the colors of a flowing banner along, until stopped */
export const flow = (banner: Banner, text: string): Generator<Frame> =>
  loop(banner, text, { flow: true })

/** Types the text out one character at a time */
export function* typewriter(
  banner: Banner,
  text: string,
  delay = 70,
): Generator<Frame> {
  // Render the full text first so every frame uses its final layout
  banner.render(text)
  const chars = [...text]
  for (let i = 1; i <= chars.length; i++) {
    const last = i === chars.length
    if (!last && !chars[i - 1]?.trim()) continue
    const partial = chars.slice(0, i).join('')
    yield { text: banner.render(partial), hold: last ? 0 : delay }
  }
}

/** The current time, every second, until stopped */
export function* clock(
  banner: Banner,
  now: () => number = Date.now,
): Generator<Frame> {
  while (true) {
    const time = now()
    yield {
      text: banner.render(formatClock(new Date(time))),
      hold: 1000 - (time % 1000) + AFTER_TICK,
    }
  }
}

/** Counts down to zero, then shows the end text if there is one */
export function* countdown(
  banner: Banner,
  duration: number,
  endText?: string,
  now: () => number = Date.now,
): Generator<Frame> {
  const end = now() + duration
  for (let left = end - now(); left > 0; left = end - now()) {
    // Hold until the shown second changes
    yield {
      text: banner.render(formatCountdown(left)),
      hold: (left % 1000 || 1000) + AFTER_TICK,
    }
  }
  yield { text: banner.render(endText || formatCountdown(0)), hold: 0 }
}
