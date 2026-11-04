import assert from 'assert'
import fs from 'fs'
import path from 'path'
import { test } from 'node:test'
import { decode, fall, loop } from '../animate'
import echoascii from '../index'
import { comment, fill, shadow } from '../layout'
import { Banner, fitFont } from '../render'
import {
  art,
  run,
  SMALL_HI,
  SMALL_HI_TRIMMED,
  stripAnsi,
  tempDir,
} from './helpers'

// Same numbers every run, so random effects can be checked
const seeded =
  (seed = 1) =>
  () => {
    seed = (seed * 16807) % 2147483647
    return seed / 2147483647
  }

const mask = (text: string) =>
  stripAnsi(text)
    .split('\n')
    .map((line) => [...line].map((char) => (char === ' ' ? ' ' : 'x')).join(''))

test('fill draws the letters with the given characters, taking turns', () => {
  assert.deepStrictEqual(fill([' ab', 'c d'], '#'), [' ##', '# #'])
  assert.deepStrictEqual(fill([' ab', 'c d'], 'x y'), [' xy', 'x y'])
  assert.strictEqual(
    stripAnsi(echoascii('hi', { font: 'Small', fill: '#', trim: true })),
    SMALL_HI_TRIMMED.replace(/\S/g, '#'),
  )
  assert.throws(() => echoascii('hi', { fill: '  ' }), /at least one character/)
})

test('shadow falls one cell down and to the right', () => {
  assert.deepStrictEqual(shadow(['ab', ' c'], '.'), ['ab ', ' c.', '  .'])
  const shadowed = echoascii('hi', { font: 'Small', shadow: true, trim: true })
  assert.match(shadowed, /\x1b\[90m░/)
  assert.ok(
    stripAnsi(shadowed).split('\n').length >
      SMALL_HI_TRIMMED.split('\n').length,
  )
  const fenced = echoascii('hi', {
    font: 'Small',
    shadow: true,
    markdown: true,
  })
  assert.match(fenced, /░/)
  assert.doesNotMatch(fenced, /\x1b/)
})

test('comment wraps lines for languages and markers', () => {
  assert.deepStrictEqual(comment(['a', '', 'b '], 'js'), ['// a', '//', '// b'])
  assert.deepStrictEqual(comment(['a'], '#'), ['# a'])
  assert.deepStrictEqual(comment(['a'], 'sql'), ['-- a'])
  assert.deepStrictEqual(comment(['a', ''], 'css'), ['/*', ' * a', ' *', ' */'])
  assert.deepStrictEqual(comment(['a'], 'HTML'), ['<!--', '  a', '-->'])
  assert.throws(() => comment(['a'], 'cobol'), /Unknown comment style "cobol"/)

  const commented = echoascii('hi', {
    font: 'Small',
    comment: 'py',
    color: 'red',
  })
  assert.doesNotMatch(commented, /\x1b/, 'no colors in comments')
  assert.strictEqual(
    commented,
    SMALL_HI_TRIMMED.split('\n')
      .map((line) => `# ${line}`)
      .join('\n'),
  )
  assert.throws(
    () => echoascii('hi', { comment: 'js', markdown: true }),
    /either markdown or comment/,
  )
})

test('fit picks the biggest font that fits', () => {
  assert.strictEqual(fitFont('hello', {}, 200), 'Larry 3D')
  assert.strictEqual(fitFont('hello', {}, 30), 'Big')
  assert.strictEqual(fitFont('hello', { font: 'Doom' }, 200), 'Doom')
  assert.strictEqual(
    fitFont('a very long line of text', {}, 10),
    'Mini',
    'smallest when nothing fits',
  )
  assert.strictEqual(
    echoascii('hello', { fit: true, width: 30 }),
    echoascii('hello', { font: 'Big' }),
  )
})

test('fonts can be loaded from .flf files', () => {
  const dir = tempDir()
  const file = path.join(dir, 'my font.flf')
  fs.copyFileSync(
    path.join(
      __dirname,
      '..',
      '..',
      'node_modules',
      'figlet',
      'fonts',
      'Doom.flf',
    ),
    file,
  )
  assert.strictEqual(
    echoascii('hi', { font: file }),
    echoascii('hi', { font: 'Doom' }),
  )
  assert.strictEqual(
    art(['--font', './my font.flf', 'hi'], { cwd: dir }),
    art(['--font=Doom', 'hi']),
  )

  fs.writeFileSync(path.join(dir, 'bad.flf'), 'not a font')
  assert.throws(
    () => echoascii('hi', { font: path.join(dir, 'bad.flf') }),
    /isn't a FIGlet font/,
  )
  assert.throws(
    () => echoascii('hi', { font: './missing.flf' }),
    /Could not read the font file/,
  )
})

test('decode settles from noise into the banner', () => {
  const banner = new Banner({ font: 'Small', trim: true })
  const frames = [...decode(banner, 'hi', seeded())]
  const final = new Banner({ font: 'Small', trim: true }).render('hi')
  assert.strictEqual(frames.length, 30)
  assert.strictEqual(frames.at(-1)!.text, final)
  assert.notStrictEqual(frames[0]!.text, final)
  for (const frame of frames) {
    assert.deepStrictEqual(
      mask(frame.text),
      mask(final),
      'same shape all along',
    )
  }
})

test('fall drops the letters in and lands on the banner', () => {
  const banner = new Banner({ font: 'Small', trim: true })
  const frames = [...fall(banner, 'hi')]
  const final = new Banner({ font: 'Small', trim: true }).render('hi')
  assert.strictEqual(frames.at(-1)!.text, final)
  const visible = (text: string) => stripAnsi(text).replace(/\s/g, '').length
  assert.ok(
    visible(frames[0]!.text) < visible(final),
    'starts mostly above the top',
  )
  const rows = new Set(frames.map((frame) => frame.text.split('\n').length))
  assert.deepStrictEqual([...rows], [final.split('\n').length])
})

test('wave moves columns up and down without losing characters', () => {
  const banner = new Banner({ font: 'Small', trim: true })
  const lines = banner.art('hi')
  const frames = loop(banner, 'hi', { wave: true })
  for (let i = 0; i < 6; i++) {
    const frame = stripAnsi(frames.next().value!.text).split('\n')
    assert.strictEqual(frame.length, lines.length + 2)
    const column = (rows: string[], x: number) =>
      rows
        .map((row) => [...row][x] ?? ' ')
        .join('')
        .replace(/ /g, '')
    for (let x = 0; x < 8; x++)
      assert.strictEqual(column(frame, x), column(lines, x))
  }
})

test('marquee scrolls the text through a window', () => {
  const banner = new Banner({ font: 'Small', trim: true })
  const width = Math.max(...banner.art('hi').map((line) => [...line].length))
  const frames = loop(banner, 'hi', { marquee: true, columns: 20 })
  const shown = Array.from({ length: width + 21 }, () =>
    stripAnsi(frames.next().value!.text).split('\n'),
  )
  assert.ok(
    shown.every((frame) => frame.every((line) => [...line].length === 20)),
  )
  assert.ok(
    shown[0]!.every((line) => !line.trim()),
    'starts off screen',
  )
  assert.deepStrictEqual(
    shown[20],
    SMALL_HI_TRIMMED.split('\n').map((line) => line.padEnd(20)),
    'reaches the left edge after one window width',
  )
  assert.ok(
    shown[width + 20]!.every((line) => !line.trim()),
    'and loops',
  )
})

test('rain falls around the banner, behind the letters', () => {
  const banner = new Banner({ font: 'Small', trim: true })
  const frame = loop(banner, 'hi', { rain: true, columns: 30 }, seeded()).next()
    .value!.text
  assert.match(frame, /\x1b\[34m\|/, 'blue drops')
  // Letters stay as they are, and drops only fall where there's no letter
  const rows = stripAnsi(frame).split('\n')
  const expected = SMALL_HI_TRIMMED.split('\n')
  assert.strictEqual(rows.length, expected.length + 3)
  rows.slice(2, -1).forEach((row, y) => {
    const letters = [...expected[y]!]
    ;[...row].forEach((char, x) => {
      const letter = letters[x] ?? ' '
      if (letter !== ' ') assert.strictEqual(char, letter)
      else assert.ok(char === ' ' || char === '|', `drop at ${x},${y}`)
    })
  })
})

test('the CLI prints animations as a still banner without a terminal', () => {
  for (const flag of ['--decode', '--fall', '--wave', '--rain', '--snow']) {
    assert.strictEqual(art(['--font=Small', flag, 'hi']), SMALL_HI, flag)
  }
  assert.strictEqual(
    art(['--font=Small', '--marquee', '-w', '10', 'hello there']),
    art(['--font=Small', 'hello there']),
    'the marquee never wraps',
  )
})

test('the CLI has the new looks and checks combinations', () => {
  assert.strictEqual(
    art(['--font=Small', '--comment', 'js', 'hi']),
    SMALL_HI_TRIMMED.split('\n')
      .map((line) => `// ${line}`)
      .join('\n') + '\n',
  )
  assert.match(art(['--font=Small', '--fill', '@', 'hi']), /@/)
  assert.match(art(['--font=Small', '--shadow', 'hi']), /░/)

  const fitted = run(['--fit', '-w', '30', 'hello'])
  assert.match(fitted.stderr, /^font: Big$/m)
  assert.strictEqual(fitted.stdout, art(['--font=Big', '-w', '30', 'hello']))

  const cwd = tempDir()
  fs.writeFileSync(
    path.join(cwd, '.echoasciirc'),
    '{"font": "Small", "fill": "#", "comment": "sh"}',
  )
  assert.strictEqual(
    art(['hi'], { cwd }),
    SMALL_HI_TRIMMED.split('\n')
      .map((line) => `# ${line.replace(/\S/g, '#')}`)
      .join('\n') + '\n',
    'fill and comment from config',
  )

  for (const [args, message] of [
    [['--type', '--decode', 'hi'], /only one of --type, --decode and --fall/],
    [['--rain', '--snow', 'hi'], /either --rain or --snow/],
    [['--clock', '--wave'], /can't be combined with other animations/],
    [['--marquee', '--fall', 'hi'], /--marquee can't follow --fall/],
    [['--fit', '--random', 'hi'], /either --fit or --random/],
    [['--comment', 'cobol', 'hi'], /Unknown comment style/],
    [['--comment', 'js', '--markdown', 'hi'], /either markdown or comment/],
  ] as const) {
    const result = run([...args])
    assert.strictEqual(result.code, 1, args.join(' '))
    assert.match(result.stderr, message)
  }
})
