// ES module entry, so named imports work too. It wraps the CommonJS build
// instead of duplicating it, so both share one copy of the loaded fonts.
import echoascii from './index.js'

export default echoascii

export const fonts = echoascii.fonts
export const colors = echoascii.colors
export const EchoasciiError = echoascii.EchoasciiError

export type Options = echoascii.Options
export type ColorName = echoascii.ColorName
export type EchoasciiError = echoascii.EchoasciiError
