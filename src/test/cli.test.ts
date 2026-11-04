import assert from 'assert'
import { spawnSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { test } from 'node:test'
import echoascii from '../index'
import { formatClock } from '../time'
import {
  art,
  CLI,
  NO_NETWORK,
  run,
  SMALL_HI,
  SMALL_HI_TRIMMED,
  stripAnsi,
  tempDir,
} from './helpers'

const { version } = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', '..', 'package.json'), 'utf8'),
) as { version: string }

const lines = (output: string) => output.replace(/\n$/, '').split('\n')
const widest = (output: string) =>
  Math.max(...lines(output).map((line) => [...line].length))

test('renders text', () => {
  assert.strictEqual(art(['--font=Small', 'hi']), SMALL_HI)
})

test('uses Larry 3D by default', () => {
  assert.strictEqual(art(['hi']), art(['--font=Larry 3D', 'hi']))
})

test('accepts --font=X, --font X and -f X', () => {
  assert.strictEqual(art(['--font', 'Small', 'hi']), SMALL_HI)
  assert.strictEqual(art(['-f', 'Small', 'hi']), SMALL_HI)
})

test('matches font names loosely', () => {
  const expected = art(['--font=ANSI Shadow', 'hi'])
  assert.strictEqual(art(['--font=ansi-shadow', 'hi']), expected)
  assert.strictEqual(art(['--font=ansishadow', 'hi']), expected)
})

test('suggests fonts for unknown names', () => {
  const result = run(['--font=Dooom', 'hi'])
  assert.strictEqual(result.code, 1)
  assert.match(result.stderr, /Unknown font "Dooom"\. Did you mean "Doom"/)
  assert.match(result.stderr, /echoascii --list-fonts/)
  assert.strictEqual(result.stdout, '')
})

test('puts each argument on its own row with --rows', () => {
  const rows = art(['--font=Small', '--rows', 'a', 'b'])
  assert.strictEqual(rows, art(['--font=Small'], { input: 'a\nb\n' }))
  assert.notStrictEqual(rows, art(['--font=Small', 'a', 'b']))
})

test('reads piped text', () => {
  assert.strictEqual(art(['--font=Small'], { input: 'hi\n' }), SMALL_HI)
})

test('shows usage when there is nothing to print', () => {
  for (const args of [[], ['--rows'], ['']]) {
    const result = run(args)
    assert.strictEqual(result.code, 1)
    assert.match(result.stderr, /Usage: echoascii/)
  }
})

test('--help and --version', () => {
  assert.match(art(['--help']), /Usage: echoascii/)
  assert.match(art(['-h']), /Usage: echoascii/)
  assert.strictEqual(art(['--version']), `${version}\n`)
  assert.strictEqual(art(['-v']), `${version}\n`)
})

test('rejects unknown options', () => {
  const result = run(['--nope', 'hi'])
  assert.strictEqual(result.code, 1)
  assert.match(result.stderr, /Unknown option '--nope'/)
  assert.match(result.stderr, /echoascii --help/)
})

test('lists fonts, or previews text in every font', () => {
  const fonts = art(['--list-fonts']).trim().split('\n')
  assert.ok(fonts.length > 300)
  assert.ok(fonts.includes('Larry 3D'))
  assert.ok(art(['-l', 'hi']).includes(`Small\n${SMALL_HI}`))
})

test('wraps to --width', () => {
  const text = ['--font=Small', 'hello', 'wide', 'world']
  assert.ok(widest(art(text)) > 40)
  assert.ok(widest(art(['--width=40', ...text])) <= 40)
  assert.strictEqual(art(['--width=500', '--font=Small', 'hi']), SMALL_HI)

  const result = run(['--width=abc', 'hi'])
  assert.strictEqual(result.code, 1)
  assert.match(result.stderr, /--width must be a positive whole number/)
})

test('--trim removes the blank space around the banner', () => {
  assert.strictEqual(
    art(['--font=Small', '--trim', 'hi']),
    `${SMALL_HI_TRIMMED}\n`,
  )
})

test('--markdown wraps the trimmed banner in a code block, without colors', () => {
  const expected = `\`\`\`\n${SMALL_HI_TRIMMED}\n\`\`\`\n`
  assert.strictEqual(art(['--font=Small', '--markdown', 'hi']), expected)
  assert.strictEqual(
    art(['--font=Small', '--markdown', '-c', 'red', 'hi']),
    expected,
  )
})

test('--border draws a box', () => {
  const box = lines(art(['--font=Small', '--border', 'hi']))
  assert.deepStrictEqual(box, [
    '┌──────────┐',
    ...SMALL_HI_TRIMMED.split('\n').map((line) => `│ ${line.padEnd(8)} │`),
    '└──────────┘',
  ])
})

test('--center centers in the width, or 80 columns without a terminal', () => {
  const indent = (output: string) => lines(output)[0]!.search(/\S/) - 1
  assert.strictEqual(indent(art(['--font=Small', '--center', 'hi'])), 36)
  assert.strictEqual(
    indent(art(['--font=Small', '--center', '-w', '40', 'hi'])),
    16,
  )
})

test('colors output', () => {
  const red = art(['--font=Small', '--color=red', 'hi'])
  assert.match(red, /\x1b\[31m/)
  assert.strictEqual(stripAnsi(red), SMALL_HI)
  assert.strictEqual(art(['--font=Small', '-c', 'RED', 'hi']), red)

  const hex = art(['--font=Small', '-c', 'ff8800', 'hi'])
  assert.match(hex, /\x1b\[38;5;\d+m/)
  assert.strictEqual(art(['--font=Small', '-c', '#f80', 'hi']), hex)

  const rainbow = art(['--font=Small', '--rainbow', 'hi'])
  assert.match(rainbow, /\x1b\[38;5;\d+m/)
  assert.strictEqual(stripAnsi(rainbow), SMALL_HI)

  const result = run(['--color=purple', 'hi'])
  assert.strictEqual(result.code, 1)
  assert.match(result.stderr, /Unknown color "purple"/)
})

test('--gradient blends colors, in 24-bit when the terminal supports it', () => {
  const gradient = art(['--font=Small', '--gradient', 'red,blue', 'hi'])
  assert.match(gradient, /\x1b\[38;5;\d+m/)
  assert.strictEqual(stripAnsi(gradient), SMALL_HI)

  const truecolor = art(['--font=Small', '-g', 'ff0000,0000ff', 'hi'], {
    env: { COLORTERM: 'truecolor' },
  })
  assert.match(truecolor, /\x1b\[38;2;255;0;0m/)
  assert.match(truecolor, /\x1b\[38;2;0;0;255m/)

  for (const [args, message] of [
    [['-g', 'red', 'hi'], /at least two colors/],
    [['-g', 'red,nope', 'hi'], /Unknown color "nope"/],
    [
      ['-g', 'red,blue', '--rainbow', 'hi'],
      /only one of color, rainbow and gradient/,
    ],
  ] as const) {
    const result = run([...args])
    assert.strictEqual(result.code, 1)
    assert.match(result.stderr, message)
  }
})

test('a color flag replaces the color from config', () => {
  const cwd = tempDir()
  fs.writeFileSync(path.join(cwd, '.echoasciirc'), '{"color": "red"}')
  const rainbow = art(['--font=Small', '--rainbow', 'hi'], { cwd })
  assert.strictEqual(rainbow, art(['--font=Small', '--rainbow', 'hi']))
})

test('picks a random font with --random', () => {
  const result = run(['--random', 'hi'])
  assert.strictEqual(result.code, 0)
  const font = result.stderr.match(/^font: (.+)$/m)?.[1]
  assert.ok(font)
  assert.strictEqual(result.stdout, art([`--font=${font}`, 'hi']))
})

test('--type prints the banner straight away without a terminal', () => {
  assert.strictEqual(art(['--font=Small', '--type', 'hi']), SMALL_HI)
})

test('--flow prints still colors without a terminal', () => {
  assert.strictEqual(
    art(['--font=Small', '--flow', 'hi']),
    art(['--font=Small', '--rainbow', 'hi']),
  )
  assert.strictEqual(
    art(['--font=Small', '--flow', '-g', 'red,blue', 'hi']),
    art(['--font=Small', '-g', 'red,blue', 'hi']),
  )

  const cwd = tempDir()
  fs.writeFileSync(path.join(cwd, '.echoasciirc'), '{"color": "red"}')
  assert.strictEqual(
    art(['--font=Small', '--flow', 'hi'], { cwd }),
    art(['--font=Small', '--rainbow', 'hi']),
    '--flow replaces a solid color from config',
  )

  for (const [args, message] of [
    [['--flow', '-c', 'red', 'hi'], /needs --rainbow or --gradient/],
    [['--flow', '--clock'], /not with --clock or --countdown/],
  ] as const) {
    const result = run([...args])
    assert.strictEqual(result.code, 1)
    assert.match(result.stderr, message)
  }
})

test('--countdown counts down, then shows the text', () => {
  const started = Date.now()
  const output = art(['--font=Small', '--countdown', '2', 'Go'])
  assert.ok(Date.now() - started >= 1900, 'took the whole countdown')
  const frame = (text: string) => echoascii(text, { font: 'Small' }) + '\n'
  assert.strictEqual(output, frame('00:02') + frame('00:01') + frame('Go'))

  const result = run(['--countdown', 'soon'])
  assert.strictEqual(result.code, 1)
  assert.match(result.stderr, /Can't read "soon" as a duration/)
})

test('--clock prints the time once without a terminal', () => {
  const output = art(['--font=Small', '--clock'])
  const now = Date.now()
  const nearby = [-2, -1, 0].map(
    (s) =>
      echoascii(formatClock(new Date(now + s * 1000)), { font: 'Small' }) +
      '\n',
  )
  assert.ok(nearby.includes(output))

  for (const [args, message] of [
    [['--clock', 'hi'], /takes no text/],
    [['--clock', '--countdown', '1'], /either --clock or --countdown/],
  ] as const) {
    const result = run([...args])
    assert.strictEqual(result.code, 1)
    assert.match(result.stderr, message)
  }
})

test('reads config from .echoasciirc, package.json and home', () => {
  const home = tempDir()
  const cwd = tempDir()
  const write = (dir: string, file: string, data: unknown) =>
    fs.writeFileSync(path.join(dir, file), JSON.stringify(data))

  write(home, '.echoasciirc', { font: 'Doom', color: 'red' })
  assert.strictEqual(
    art(['hi'], { cwd, home }),
    art(['--font=Doom', '--color=red', 'hi']),
  )

  write(cwd, 'package.json', { echoascii: { font: 'Big', border: true } })
  assert.strictEqual(
    art(['hi'], { cwd, home }),
    art(['--font=Big', '--color=red', '--border', 'hi']),
  )

  write(cwd, '.echoasciirc.json', { font: 'Small' })
  assert.match(
    stripAnsi(art(['hi'], { cwd, home })),
    /^┌/,
    'project rc merges with package.json and home',
  )
  assert.strictEqual(
    stripAnsi(art(['--font=Doom', 'hi'], { cwd, home })),
    art(['--font=Doom', '--border', 'hi']),
    'flags beat config',
  )
})

test('reports broken config files', () => {
  const cwd = tempDir()
  fs.writeFileSync(path.join(cwd, '.echoasciirc'), '{ font: Doom }')
  let result = run(['hi'], { cwd })
  assert.strictEqual(result.code, 1)
  assert.match(result.stderr, /Could not parse .*\.echoasciirc/)

  fs.writeFileSync(path.join(cwd, '.echoasciirc'), '{ "fnot": "Doom" }')
  result = run(['hi'], { cwd })
  assert.strictEqual(result.code, 1)
  assert.match(result.stderr, /Unknown option "fnot"/)

  // Someone else's broken package.json is ignored. Node itself chokes on it
  // when loading the network blocker, so run this one without it
  fs.rmSync(path.join(cwd, '.echoasciirc'))
  fs.writeFileSync(path.join(cwd, 'package.json'), '{ broken')
  assert.strictEqual(
    art(['--font=Small', 'hi'], { cwd, blockNetwork: false }),
    SMALL_HI,
  )
})

test('never runs .echoasciirc.js', () => {
  const cwd = tempDir()
  const marker = path.join(cwd, 'ran')
  fs.writeFileSync(
    path.join(cwd, '.echoasciirc.js'),
    `require('fs').writeFileSync(${JSON.stringify(marker)}, '')`,
  )
  art(['hi'], { cwd })
  assert.ok(!fs.existsSync(marker))
})

test('the network blocker works', () => {
  const result = spawnSync(
    process.execPath,
    ['--require', NO_NETWORK, '-e', 'fetch("https://example.com")'],
    { encoding: 'utf8' },
  )
  assert.notStrictEqual(result.status, 0)
  assert.match(result.stderr, /tried to use the network/)
})

test('renders every bundled font offline', () => {
  const result = run(['--list-fonts', '--border', 'Hi!'])
  assert.strictEqual(result.code, 0, result.stderr)
  assert.strictEqual(result.stderr, '')
})

test(
  'exits quietly when the reader goes away',
  { skip: process.platform === 'win32' },
  () => {
    const result = spawnSync(
      'sh',
      ['-c', `"${process.execPath}" "${CLI}" --list-fonts hi | head -1`],
      { encoding: 'utf8', cwd: tempDir() },
    )
    assert.strictEqual(result.stderr, '')
  },
)
