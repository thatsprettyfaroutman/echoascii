import assert from 'assert'
import { spawnSync } from 'child_process'
import path from 'path'
import { test } from 'node:test'
import echoascii from '../index'
import {
  art,
  NO_NETWORK,
  SMALL_HI,
  SMALL_HI_TRIMMED,
  stripAnsi,
} from './helpers'

const ENTRY = path.join(__dirname, '..', 'index.js')
const ESM_ENTRY = path.join(__dirname, '..', 'index.mjs')

test('returns the same banner as the CLI', () => {
  assert.strictEqual(echoascii('hi', { font: 'Small' }) + '\n', SMALL_HI)
  assert.strictEqual(echoascii('hi') + '\n', art(['hi']))
  assert.strictEqual(
    echoascii('a\nb', { font: 'Small' }) + '\n',
    art(['--font=Small', '--rows', 'a', 'b']),
  )
})

test('require() gives a callable function', () => {
  const required = require(ENTRY) as typeof echoascii
  assert.strictEqual(typeof required, 'function')
  assert.strictEqual(required('hi', { font: 'Small' }) + '\n', SMALL_HI)
  assert.strictEqual(required.default, required)
})

test('the ES module entry has a default and named exports', async () => {
  const esm = (await import(ESM_ENTRY)) as Record<string, unknown>
  const required = require(ENTRY) as typeof echoascii
  assert.strictEqual(esm.default, required)
  assert.strictEqual(esm.fonts, required.fonts)
  assert.strictEqual(esm.colors, required.colors)
  assert.strictEqual(esm.EchoasciiError, required.EchoasciiError)
})

test('layout and color options', () => {
  assert.strictEqual(
    echoascii('hi', { font: 'Small', trim: true }),
    SMALL_HI_TRIMMED,
  )
  assert.strictEqual(
    echoascii('hi', { font: 'Small', markdown: true }),
    `\`\`\`\n${SMALL_HI_TRIMMED}\n\`\`\``,
  )
  assert.match(echoascii('hi', { font: 'Small', border: true }), /^┌─+┐\n│/)
  assert.match(
    echoascii('hi', { font: 'Small', center: true, width: 20 }),
    /^ {6} _/,
  )

  const gradient = echoascii('hi', {
    font: 'Small',
    gradient: ['red', 'blue'],
    truecolor: true,
  })
  assert.match(gradient, /\x1b\[38;2;/)
  assert.strictEqual(stripAnsi(gradient) + '\n', SMALL_HI)
})

test('fonts() and colors', () => {
  const fonts = echoascii.fonts()
  assert.ok(fonts.includes('Larry 3D'))
  fonts.length = 0
  assert.ok(echoascii.fonts().length > 300, 'returns a copy')
  assert.ok(echoascii.colors.includes('red'))
})

test('throws EchoasciiError for bad options', () => {
  const cases: [echoascii.Options, RegExp, string][] = [
    [{ font: 'Dooom' }, /Did you mean "Doom"/, 'UNKNOWN_FONT'],
    [{ color: 'purple' }, /Unknown color/, 'INVALID_OPTION'],
    [{ gradient: 'red' }, /at least two colors/, 'INVALID_OPTION'],
    [{ color: 'red', rainbow: true }, /only one of/, 'INVALID_OPTION'],
    [{ width: 0 }, /positive whole number/, 'INVALID_OPTION'],
  ]
  for (const [options, message, code] of cases) {
    assert.throws(
      () => echoascii('hi', options),
      (error: unknown) =>
        error instanceof echoascii.EchoasciiError &&
        message.test(error.message) &&
        error.code === code,
    )
  }
})

test('rendering every font never touches the network', () => {
  const script = `
    const echoascii = require(${JSON.stringify(ENTRY)})
    for (const font of echoascii.fonts()) echoascii('Hi!', { font, border: true })
  `
  const result = spawnSync(
    process.execPath,
    ['--require', NO_NETWORK, '-e', script],
    {
      encoding: 'utf8',
    },
  )
  assert.strictEqual(result.status, 0, result.stderr)
})
