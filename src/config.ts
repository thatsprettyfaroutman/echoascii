import fs from 'fs'
import os from 'os'
import path from 'path'
import { EchoasciiError } from './errors'

const RC_FILES = ['.echoasciirc', '.echoasciirc.json']

// Config keys and their types, same names as the long CLI flags
const SCHEMA = {
  font: 'string',
  fit: 'boolean',
  rows: 'boolean',
  width: 'number',
  color: 'string',
  rainbow: 'boolean',
  gradient: 'string',
  center: 'boolean',
  trim: 'boolean',
  border: 'boolean',
  shadow: 'boolean',
  fill: 'string',
  markdown: 'boolean',
  comment: 'string',
  random: 'boolean',
} as const

type Schema = typeof SCHEMA
type TypeOf<T> = T extends 'string'
  ? string
  : T extends 'number'
    ? number
    : boolean

export type Config = { -readonly [K in keyof Schema]?: TypeOf<Schema[K]> }

const isKey = (key: string): key is keyof Schema => Object.hasOwn(SCHEMA, key)

const validate = (config: unknown, file: string): Config => {
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    throw new EchoasciiError(`${file} must contain a JSON object`)
  }
  for (const [key, value] of Object.entries(config)) {
    if (!isKey(key)) {
      throw new EchoasciiError(`Unknown option "${key}" in ${file}`)
    }
    if (typeof value !== SCHEMA[key]) {
      throw new EchoasciiError(`"${key}" in ${file} must be a ${SCHEMA[key]}`)
    }
  }
  return config as Config
}

// Returns undefined when the file doesn't exist
const readJson = (file: string): unknown => {
  let source: string
  try {
    source = fs.readFileSync(file, 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined
    throw new EchoasciiError(
      `Could not read ${file}: ${(error as Error).message}`,
    )
  }
  try {
    return JSON.parse(source)
  } catch (error) {
    throw new EchoasciiError(
      `Could not parse ${file}: ${(error as Error).message}`,
    )
  }
}

const loadRc = (dir: string): Config | undefined => {
  for (const name of RC_FILES) {
    const file = path.join(dir, name)
    const config = readJson(file)
    if (config !== undefined) return validate(config, file)
  }
  return undefined
}

// A broken package.json belongs to someone else's project, so ignore it
const loadPackageConfig = (dir: string): Config | undefined => {
  const file = path.join(dir, 'package.json')
  let config: unknown
  try {
    config = (readJson(file) as { echoascii?: unknown } | undefined)?.echoascii
  } catch {
    return undefined
  }
  return config === undefined ? undefined : validate(config, file)
}

/** Later sources win: home rc < package.json "echoascii" key < project rc */
export const loadConfig = ({
  cwd = process.cwd(),
  home = os.homedir(),
} = {}): Config => ({
  ...loadRc(home),
  ...loadPackageConfig(cwd),
  ...loadRc(cwd),
})
