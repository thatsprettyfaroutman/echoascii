/** Thrown for bad input, like an unknown font or color. Safe to show to users. */
export class EchoasciiError extends Error {
  readonly code: string

  constructor(message: string, code = 'INVALID_OPTION') {
    super(message)
    this.name = 'EchoasciiError'
    this.code = code
  }
}
