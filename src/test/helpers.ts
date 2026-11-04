import assert from 'assert'
import { spawnSync } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'

export const CLI = path.join(__dirname, '..', 'cli.js')
export const NO_NETWORK = path.join(__dirname, 'no-network.js')

export const tempDir = (): string =>
  fs.mkdtempSync(path.join(os.tmpdir(), 'echoascii-'))

export interface RunOptions {
  input?: string
  cwd?: string
  home?: string
  blockNetwork?: boolean
  env?: Record<string, string>
}

export interface RunResult {
  code: number | null
  stdout: string
  stderr: string
}

// Runs the CLI with the network blocked, in an empty dir with an empty home
// so a real ~/.echoasciirc can't leak in, and without $COLORTERM so colors
// come out the same everywhere
export const run = (
  args: string[],
  {
    input = '',
    cwd = tempDir(),
    home = cwd,
    blockNetwork = true,
    env = {},
  }: RunOptions = {},
): RunResult => {
  const { COLORTERM: _, ...inherited } = process.env
  const preload = blockNetwork ? ['--require', NO_NETWORK] : []
  const result = spawnSync(process.execPath, [...preload, CLI, ...args], {
    cwd,
    input,
    encoding: 'utf8',
    env: { ...inherited, HOME: home, USERPROFILE: home, ...env },
  })
  return { code: result.status, stdout: result.stdout, stderr: result.stderr }
}

/** Runs the CLI and returns stdout, failing the test if it errors */
export const art = (args: string[], options?: RunOptions): string => {
  const result = run(args, options)
  assert.strictEqual(result.code, 0, result.stderr)
  return result.stdout
}

export const stripAnsi = (text: string): string =>
  text.replace(/\x1b\[[\d;]*m/g, '')

export const SMALL_HI = [
  '   _    _  ',
  '  | |_ (_) ',
  "  | ' \\| | ",
  '  |_||_|_| ',
  '           ',
  '',
].join('\n')

export const SMALL_HI_TRIMMED = [
  ' _    _',
  '| |_ (_)',
  "| ' \\| |",
  '|_||_|_|',
].join('\n')
