/** Base class for typed errors raised by command codecs. */
export class CommandError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.code = code
    this.name = 'CommandError'
  }
}

export class CommandMismatchError extends CommandError {
  readonly expected: number
  readonly actual: number

  constructor(expected: number, actual: number) {
    super(
      'COMMAND_MISMATCH',
      `Expected command byte 0x${expected.toString(16).padStart(2, '0').toUpperCase()} but got 0x${actual.toString(16).padStart(2, '0').toUpperCase()}`,
    )
    this.name = 'CommandMismatchError'
    this.expected = expected
    this.actual = actual
  }
}

export class CommandPayloadError extends CommandError {
  constructor(message: string) {
    super('COMMAND_PAYLOAD', message)
    this.name = 'CommandPayloadError'
  }
}
