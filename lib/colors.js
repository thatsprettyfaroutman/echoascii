const COLORS = {
  red: 31,
  green: 32,
  yellow: 33,
  blue: 34,
  magenta: 35,
  cyan: 36,
  white: 37,
  gray: 90,
}

const RESET = '\x1b[0m'

const color = (text, name) =>
  text
    .split('\n')
    .map((line) =>
      line.trim() ? `\x1b[${COLORS[name]}m${line}${RESET}` : line,
    )
    .join('\n')

// Three phase-shifted sine waves mapped onto the 256 color palette, like lolcat
const rainbowCode = (position) => {
  const [r, g, b] = [0, 2, 4].map((phase) =>
    Math.round((Math.sin(0.15 * position + (phase * Math.PI) / 3) + 1) * 2.5),
  )
  return 16 + 36 * r + 6 * g + b
}

// Colors run diagonally; spaces are skipped so the codes stay small
const rainbow = (text) =>
  text
    .split('\n')
    .map((line, y) => {
      let output = ''
      let current
      for (const [x, char] of [...line].entries()) {
        if (char !== ' ') {
          const code = rainbowCode(x / 2 + y)
          if (code !== current) output += `\x1b[38;5;${code}m`
          current = code
        }
        output += char
      }
      return current === undefined ? output : output + RESET
    })
    .join('\n')

module.exports = { COLORS, color, rainbow }
