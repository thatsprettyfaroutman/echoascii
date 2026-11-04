import assert from 'assert'
import fs from 'fs'
import path from 'path'
import { test } from 'node:test'
import {
  countdown,
  HIDE_CURSOR,
  play,
  SHOW_CURSOR,
  typewriter,
  type Frame,
} from '../animate'
import { colorize } from '../colors'
import { loadConfig } from '../config'
import { findFont, suggestFonts } from '../fonts'
import { border, center, crop, markdown, measure, union } from '../layout'
import { Banner } from '../render'
import { formatClock, formatCountdown, parseDuration } from '../time'
import { stripAnsi, tempDir } from './helpers'

test('findFont and suggestFonts', () => {
  const fonts = ['ANSI Shadow', 'Doom', 'Larry 3D', 'Larry 3D 2', 'Small']
  assert.strictEqual(findFont('Doom', fonts), 'Doom')
  assert.strictEqual(findFont('larry_3d', fonts), 'Larry 3D')
  assert.strictEqual(findFont('nope', fonts), undefined)
  assert.deepStrictEqual(suggestFonts('larry', fonts), [
    'Larry 3D',
    'Larry 3D 2',
  ])
  assert.deepStrictEqual(suggestFonts('smal', fonts), ['Small'])
  assert.deepStrictEqual(suggestFonts('zzzzzz', fonts), [])
})

test('colorize keeps the text intact', () => {
  const lines = [' ab ', '', ' cd ']
  for (const options of [
    { color: 'cyan' },
    { color: '#123456', truecolor: true },
    { rainbow: true },
    { gradient: 'red,green,blue' },
    { gradient: ['#000', '#fff'], truecolor: true },
  ]) {
    const colored = colorize(lines, options)
    assert.deepStrictEqual(colored.map(stripAnsi), lines)
    assert.strictEqual(colored[1], '', 'blank lines get no codes')
  }
})

test('gradients run from the first color to the last', () => {
  const [line] = colorize(['abc'], {
    gradient: '000000,ffffff',
    truecolor: true,
  })
  assert.strictEqual(
    line,
    '\x1b[38;2;0;0;0ma\x1b[38;2;128;128;128mb\x1b[38;2;255;255;255mc\x1b[0m',
  )
})

test('layout helpers', () => {
  const art = ['      ', '  ab  ', '   c  ', '      ']
  const bounds = measure(art)
  assert.deepStrictEqual(bounds, { top: 1, bottom: 3, left: 2, right: 4 })
  assert.deepStrictEqual(crop(art, bounds!), ['ab', ' c'])
  assert.strictEqual(measure(['   ', '']), undefined)
  assert.deepStrictEqual(
    union(bounds, { top: 0, bottom: 2, left: 3, right: 6 }),
    {
      top: 0,
      bottom: 3,
      left: 2,
      right: 6,
    },
  )
  assert.deepStrictEqual(border(['ab', 'c'], 2), [
    '┌────┐',
    '│ ab │',
    '│ c  │',
    '└────┘',
  ])
  assert.deepStrictEqual(center(['ab', '', 'c'], 2, 10), [
    '    ab',
    '',
    '    c',
  ])
  assert.deepStrictEqual(markdown(['a']), ['```', 'a', '```'])
  assert.deepStrictEqual(markdown(['```']), ['````', '```', '````'])
})

test('parseDuration', () => {
  const cases: [string, number][] = [
    ['90', 90],
    ['1.5', 1.5],
    ['90s', 90],
    ['5m', 300],
    ['1h30m', 5400],
    ['1h 30m 15s', 5415],
    ['10:00', 600],
    ['1:00:00', 3600],
    ['0', 0],
  ]
  for (const [input, seconds] of cases) {
    assert.strictEqual(parseDuration(input), seconds * 1000, input)
  }
  for (const input of ['', 'soon', '5x', '1:2', 'm']) {
    assert.throws(() => parseDuration(input), /Can't read/, input)
  }
})

test('formatCountdown and formatClock', () => {
  assert.strictEqual(formatCountdown(0), '00:00')
  assert.strictEqual(formatCountdown(1), '00:01', 'rounds up')
  assert.strictEqual(formatCountdown(61_000), '01:01')
  assert.strictEqual(formatCountdown(3_600_000), '1:00:00')
  assert.strictEqual(formatClock(new Date(2026, 0, 1, 9, 5, 3)), '09:05:03')
})

const screen = (isTTY: boolean) => {
  let output = ''
  return {
    isTTY,
    write: (text: string) => void (output += text),
    get output() {
      return output
    },
  }
}

test('play redraws frames in place in a terminal', async () => {
  const frames: Frame[] = [
    { text: 'one\none', hold: 0 },
    { text: 'two', hold: 0 },
  ]
  const tty = screen(true)
  await play(frames, tty)
  assert.strictEqual(
    tty.output,
    `${HIDE_CURSOR}one\none\n\x1b[2F\x1b[Jtwo\n${SHOW_CURSOR}`,
  )

  const pipe = screen(false)
  await play(frames, pipe)
  assert.strictEqual(pipe.output, 'one\none\ntwo\n')
})

test('countdown frames follow the clock', () => {
  let time = 0
  const banner = new Banner({ font: 'Small' })
  const shown: string[] = []
  const holds: number[] = []
  for (const frame of countdown(banner, 2500, 'Go', () => time)) {
    shown.push(frame.text)
    holds.push(frame.hold)
    time += frame.hold
  }
  assert.deepStrictEqual(
    shown,
    ['00:03', '00:02', '00:01', 'Go'].map((text) => banner.render(text)),
  )
  // Each hold lasts until just after the shown second changes
  assert.deepStrictEqual(holds, [510, 1000, 1000, 0])
})

test('typewriter keeps every frame the final size', () => {
  const banner = new Banner({ font: 'Small', border: true })
  const frames = [...typewriter(banner, 'hi you')]
  // One frame per letter, spaces are skipped
  assert.strictEqual(frames.length, 5)
  const sizes = new Set(
    frames.map(({ text }) => {
      const rows = text.split('\n')
      return `${rows.length}x${[...rows[0]!].length}`
    }),
  )
  assert.strictEqual(sizes.size, 1)
  assert.strictEqual(
    frames.at(-1)?.text,
    new Banner({ font: 'Small', border: true }).render('hi you'),
  )
})

// Maps every visible character to the color code it's drawn with
const colorsByPosition = (text: string) => {
  const colors = new Map<string, string>()
  text.split('\n').forEach((line, y) => {
    let x = 0
    let current = ''
    for (const [, escape, char] of line.matchAll(/(\x1b\[[\d;]*m)|(.)/gsu)) {
      if (escape) current = escape
      else if (char !== ' ') colors.set(`${x++},${y}`, current)
      else x++
    }
  })
  return colors
}

test('typed letters keep their gradient color as the rest appears', () => {
  const banner = new Banner({
    font: 'Small',
    gradient: 'red,blue',
    truecolor: true,
  })
  const frames = [...typewriter(banner, 'hello')]
  const final = colorsByPosition(frames.at(-1)!.text)
  for (const frame of frames) {
    for (const [position, color] of colorsByPosition(frame.text)) {
      assert.strictEqual(color, final.get(position), position)
    }
  }
})

test('loadConfig merges sources in order', () => {
  const home = tempDir()
  const cwd = tempDir()
  assert.deepStrictEqual(loadConfig({ cwd, home }), {})
  fs.writeFileSync(
    path.join(home, '.echoasciirc'),
    '{"font":"Doom","rows":true}',
  )
  fs.writeFileSync(path.join(cwd, '.echoasciirc'), '{"font":"Small"}')
  assert.deepStrictEqual(loadConfig({ cwd, home }), {
    font: 'Small',
    rows: true,
  })
})
