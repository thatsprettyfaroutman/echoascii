const { test } = require('node:test')
const assert = require('node:assert')
const { spawnSync } = require('node:child_process')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { findFont, suggestFonts } = require('../lib/fonts')
const { color, rainbow } = require('../lib/colors')
const { loadConfig } = require('../lib/config')
const { version } = require('../package.json')

const CLI = path.join(__dirname, '..', 'bin', 'echoascii.js')
const NO_NETWORK = path.join(__dirname, 'no-network.js')

const tempDir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'echoascii-'))

// Runs the CLI with the network blocked, in an empty dir with an empty home
// so a real ~/.echoasciirc can't leak in
const run = (
  args,
  { input = '', cwd = tempDir(), home = cwd, blockNetwork = true } = {},
) => {
  const preload = blockNetwork ? ['--require', NO_NETWORK] : []
  const result = spawnSync(process.execPath, [...preload, CLI, ...args], {
    cwd,
    input,
    encoding: 'utf8',
    env: { ...process.env, HOME: home, USERPROFILE: home },
  })
  return { code: result.status, stdout: result.stdout, stderr: result.stderr }
}

const art = (args, options) => {
  const result = run(args, options)
  assert.strictEqual(result.code, 0, result.stderr)
  return result.stdout
}

const stripAnsi = (text) => text.replace(/\x1b\[[\d;]*m/g, '')

const SMALL_HI = [
  '   _    _  ',
  '  | |_ (_) ',
  "  | ' \\| | ",
  '  |_||_|_| ',
  '           ',
  '',
].join('\n')

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

  const preview = art(['-l', 'hi'])
  assert.ok(preview.includes(`Small\n${SMALL_HI}`))
})

test('wraps to --width', () => {
  const text = ['--font=Small', 'hello', 'wide', 'world']
  const widest = (output) =>
    Math.max(...output.split('\n').map((line) => line.length))
  assert.ok(widest(art(text)) > 40)
  assert.ok(widest(art(['--width=40', ...text])) <= 40)
  assert.strictEqual(art(['--width=500', '--font=Small', 'hi']), SMALL_HI)

  const result = run(['--width=abc', 'hi'])
  assert.strictEqual(result.code, 1)
  assert.match(result.stderr, /--width must be a positive whole number/)
})

test('colors output', () => {
  const red = art(['--font=Small', '--color=red', 'hi'])
  assert.match(red, /\x1b\[31m/)
  assert.strictEqual(stripAnsi(red), SMALL_HI)
  assert.strictEqual(art(['--font=Small', '-c', 'RED', 'hi']), red)

  const rainbowed = art(['--font=Small', '--rainbow', 'hi'])
  assert.match(rainbowed, /\x1b\[38;5;\d+m/)
  assert.strictEqual(stripAnsi(rainbowed), SMALL_HI)

  const result = run(['--color=purple', 'hi'])
  assert.strictEqual(result.code, 1)
  assert.match(result.stderr, /Unknown color "purple"/)
})

test('picks a random font with --random', () => {
  const result = run(['--random', 'hi'])
  assert.strictEqual(result.code, 0)
  const font = result.stderr.match(/^font: (.+)$/m)[1]
  assert.strictEqual(result.stdout, art([`--font=${font}`, 'hi']))
})

test('reads config from .echoasciirc, package.json and home', () => {
  const home = tempDir()
  const cwd = tempDir()
  const write = (dir, file, data) =>
    fs.writeFileSync(path.join(dir, file), JSON.stringify(data))

  write(home, '.echoasciirc', { font: 'Doom', color: 'red' })
  assert.strictEqual(
    art(['hi'], { cwd, home }),
    art(['--font=Doom', '--color=red', 'hi']),
  )

  write(cwd, 'package.json', { echoascii: { font: 'Big' } })
  assert.strictEqual(
    art(['hi'], { cwd, home }),
    art(['--font=Big', '--color=red', 'hi']),
  )

  write(cwd, '.echoasciirc.json', { font: 'Small' })
  assert.strictEqual(
    stripAnsi(art(['hi'], { cwd, home })),
    SMALL_HI,
    'project rc beats package.json and home',
  )
  assert.strictEqual(
    stripAnsi(art(['--font=Doom', 'hi'], { cwd, home })),
    art(['--font=Doom', 'hi']),
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
  const result = run(['--list-fonts', 'Hi!'])
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

test('color and rainbow keep the text intact', () => {
  const text = ' ab \n\n cd '
  assert.strictEqual(stripAnsi(color(text, 'cyan')), text)
  assert.strictEqual(stripAnsi(rainbow(text)), text)
  assert.strictEqual(rainbow('   '), '   ', 'blank lines get no codes')
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
