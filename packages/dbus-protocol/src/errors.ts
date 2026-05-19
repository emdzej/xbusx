/** Base class for every protocol-layer error this package throws. */
export class DBusProtocolError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.code = code
    this.name = 'DBusProtocolError'
  }
}

export class DBusFrameTooLargeError extends DBusProtocolError {
  readonly actualLength: number
  readonly maxLength: number

  constructor(actualLength: number, maxLength: number) {
    super('FRAME_TOO_LARGE', `D-bus frame size ${actualLength} exceeds max ${maxLength}`)
    this.name = 'DBusFrameTooLargeError'
    this.actualLength = actualLength
    this.maxLength = maxLength
  }
}

export class DBusFrameTooSmallError extends DBusProtocolError {
  readonly actualLength: number

  constructor(actualLength: number) {
    super('FRAME_TOO_SMALL', `D-bus frame size ${actualLength} is below minimum (4)`)
    this.name = 'DBusFrameTooSmallError'
    this.actualLength = actualLength
  }
}

export class DBusFrameLengthMismatchError extends DBusProtocolError {
  readonly actualLength: number
  readonly expectedLength: number

  constructor(actualLength: number, expectedLength: number) {
    super(
      'FRAME_LENGTH_MISMATCH',
      `D-bus frame buffer length ${actualLength} does not match LEN field ${expectedLength}`,
    )
    this.name = 'DBusFrameLengthMismatchError'
    this.actualLength = actualLength
    this.expectedLength = expectedLength
  }
}

export class DBusChecksumError extends DBusProtocolError {
  readonly computed: number
  readonly received: number

  constructor(computed: number, received: number) {
    super(
      'CHECKSUM_MISMATCH',
      `D-bus checksum mismatch: computed 0x${computed.toString(16).padStart(2, '0')}, received 0x${received.toString(16).padStart(2, '0')}`,
    )
    this.name = 'DBusChecksumError'
    this.computed = computed
    this.received = received
  }
}

export class DBusInvalidAddressError extends DBusProtocolError {
  readonly input: string

  constructor(input: string) {
    super('INVALID_ADDRESS', `Cannot parse "${input}" as a D-bus address`)
    this.name = 'DBusInvalidAddressError'
    this.input = input
  }
}
