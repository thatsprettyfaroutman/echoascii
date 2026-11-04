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
      // Move to the start of the previous frame and clear everything below.
      // One write per frame, so the terminal never shows a half drawn frame.
      const back = screen.isTTY && height ? `\x1b[${height}F\x1b[J` : ''
      screen.write(back + frame.text + '\n')
      height = frame.text.split('\n').length
      if (frame.hold > 0) await sleep(frame.hold)
    }
  } finally {
    if (screen.isTTY) screen.write(SHOW_CURSOR)
  }
}

/** Scrolls the colors of a flowing banner along, until stopped */
export function* flow(
  banner: Banner,
  text: string,
  fps = 20,
): Generator<Frame> {
  for (let phase = 0; ; phase++) {
    yield { text: banner.render(text, phase), hold: 1000 / fps }
  }
}

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
