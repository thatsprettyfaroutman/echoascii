const fs = require('fs')
const os = require('os')
const path = require('path')

const RC_FILES = ['.echoasciirc', '.echoasciirc.json']

// Config keys and their expected types, same names as the long CLI flags
const SCHEMA = {
  font: 'string',
  rows: 'boolean',
  width: 'number',
  color: 'string',
  rainbow: 'boolean',
  random: 'boolean',
}

const validate = (config, file) => {
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    throw new Error(`${file} must contain a JSON object`)
  }
  for (const [key, value] of Object.entries(config)) {
    if (!SCHEMA[key]) {
      throw new Error(`Unknown option "${key}" in ${file}`)
    }
    if (typeof value !== SCHEMA[key]) {
      throw new Error(`"${key}" in ${file} must be a ${SCHEMA[key]}`)
    }
  }
  return config
}

// Returns undefined when the file doesn't exist
const readJson = (file) => {
  let source
  try {
    source = fs.readFileSync(file, 'utf8')
  } catch (error) {
    if (error.code === 'ENOENT') return undefined
    throw new Error(`Could not read ${file}: ${error.message}`)
  }
  try {
    return JSON.parse(source)
  } catch (error) {
    throw new Error(`Could not parse ${file}: ${error.message}`)
  }
}

const loadRc = (dir) => {
  for (const name of RC_FILES) {
    const file = path.join(dir, name)
    const config = readJson(file)
    if (config !== undefined) return validate(config, file)
  }
}

// A broken package.json belongs to someone else's project, so ignore it
const loadPackageConfig = (dir) => {
  const file = path.join(dir, 'package.json')
  let config
  try {
    config = readJson(file)?.echoascii
  } catch {
    return undefined
  }
  return config === undefined ? undefined : validate(config, file)
}

// Later sources win: home rc < package.json "echoascii" key < project rc
const loadConfig = ({ cwd = process.cwd(), home = os.homedir() } = {}) => ({
  ...loadRc(home),
  ...loadPackageConfig(cwd),
  ...loadRc(cwd),
})

module.exports = { loadConfig }
