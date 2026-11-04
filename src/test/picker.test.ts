import assert from 'assert'
import { test } from 'node:test'
import {
  matching,
  parseKeys,
  pickedCommand,
  reduce,
  view,
  type Key,
  type PickerState,
} from '../picker'
import { run, stripAnsi } from './helpers'

const FONTS = ['ANSI Shadow', 'Doom', 'Larry 3D', 'Shadow', 'Small']
const start: PickerState = { fonts: FONTS, query: '', font: 'Doom' }

const press = (state: PickerState, ...keys: Key[]) =>
  keys.reduce((current, key) => reduce(current, key).state, state)

test('parseKeys', () => {
  assert.deepStrictEqual(parseKeys('\x1b[A\x1b[B\x1bOA'), ['up', 'down', 'up'])
  assert.deepStrictEqual(parseKeys('\x1b[5~\x1b[6~\x1b[H\x1b[F'), [
    'pageup',
    'pagedown',
    'home',
    'end',
  ])
  assert.deepStrictEqual(parseKeys('sha'), [{ text: 'sha' }])
  assert.deepStrictEqual(parseKeys('a\x7fb\r'), [
    { text: 'a' },
    'backspace',
    { text: 'b' },
    'enter',
  ])
  assert.deepStrictEqual(parseKeys('\x1b'), ['escape'])
  assert.deepStrictEqual(parseKeys('\x03\x15'), ['cancel', 'clear'])
  assert.deepStrictEqual(
    parseKeys('\x1b[1;5A'),
    [],
    'unknown sequences are skipped',
  )
})

test('browsing wraps around', () => {
  assert.strictEqual(press(start, 'down').font, 'Larry 3D')
  assert.strictEqual(press(start, 'up', 'up').font, 'Small')
  assert.strictEqual(press(start, 'end').font, 'Small')
  assert.strictEqual(press(start, 'end', 'down').font, 'ANSI Shadow')
  assert.strictEqual(press(start, 'pagedown').font, 'Small')
})

test('typing searches, and keeps the font when it still matches', () => {
  const searched = press(start, { text: 'sha' })
  assert.deepStrictEqual(matching(searched), ['ANSI Shadow', 'Shadow'])
  assert.strictEqual(searched.font, 'ANSI Shadow')
  assert.strictEqual(press(searched, 'down').font, 'Shadow')
  assert.strictEqual(
    press(searched, 'down', 'backspace', 'backspace').font,
    'Shadow',
  )
  assert.strictEqual(press(start, { text: 'doom' }).font, 'Doom')
})

test('escape clears the search, then cancels; enter picks', () => {
  const searched = press(start, { text: 'x' })
  assert.strictEqual(reduce(searched, 'escape').done, undefined)
  assert.strictEqual(reduce(searched, 'escape').state.query, '')
  assert.strictEqual(reduce(start, 'escape').done, 'cancel')
  assert.strictEqual(reduce(start, 'cancel').done, 'cancel')
  assert.strictEqual(reduce(start, 'enter').done, 'pick')
  assert.strictEqual(
    reduce(press(start, { text: 'nothing' }), 'enter').done,
    undefined,
  )
})

test('view fills the screen without going over', () => {
  const screen = view(start, 'hi', {}, 60, 20)
  assert.strictEqual(screen.length, 20)
  const plain = screen.map(stripAnsi)
  assert.match(plain[0]!, /echoascii font picker\s+2 \/ 5$/)
  assert.match(plain[3]!, /Doom/)
  assert.match(plain.at(-1)!, /enter picks/)
  for (const line of plain) assert.ok([...line].length <= 60, line)

  const none = view(press(start, { text: 'zzz' }), 'hi', {}, 60, 20).map(
    stripAnsi,
  )
  assert.ok(none.includes(' No fonts match "zzz"'))
})

test('pickedCommand swaps in the font and keeps the rest', () => {
  assert.strictEqual(
    pickedCommand(
      ['--pick', '--font', 'Doom', '-g', 'red,blue', 'hi there'],
      'ANSI Shadow',
    ),
    "echoascii --font 'ANSI Shadow' -g red,blue 'hi there'",
  )
  assert.strictEqual(
    pickedCommand(['-p', '-fSmall', "it's"], 'Doom'),
    "echoascii --font Doom 'it'\\''s'",
  )
})

test('--pick needs a terminal', () => {
  const result = run(['--pick', 'hi'])
  assert.strictEqual(result.code, 1)
  assert.match(result.stderr, /--pick needs a terminal/)
})
