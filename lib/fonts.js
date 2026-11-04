// "ANSI Shadow", "ansi-shadow" and "ansishadow" all match
const normalize = (name) => name.toLowerCase().replace(/[\s_-]/g, '')

const distance = (a, b) => {
  let previous = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    const row = [i]
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      row[j] = Math.min(previous[j] + 1, row[j - 1] + 1, previous[j - 1] + cost)
    }
    previous = row
  }
  return previous[b.length]
}

const findFont = (name, fonts) =>
  fonts.find((font) => font === name) ||
  fonts.find((font) => normalize(font) === normalize(name))

// Fonts containing the name come first, then the closest misspellings
const suggestFonts = (name, fonts, limit = 3) => {
  const query = normalize(name)
  const maxDistance = Math.max(1, Math.floor(query.length / 3))
  return fonts
    .map((font) => {
      const key = normalize(font)
      const contains = query.length > 0 && key.includes(query)
      return {
        font,
        score: contains ? 0 : distance(query, key),
        size: key.length,
      }
    })
    .filter(({ score }) => score <= maxDistance)
    .sort((a, b) => a.score - b.score || a.size - b.size)
    .slice(0, limit)
    .map(({ font }) => font)
}

module.exports = { findFont, suggestFonts }
