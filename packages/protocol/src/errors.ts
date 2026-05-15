/** Base class for every protocol-layer error this package throws. */
export class ProtocolError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.code = code
    this.name = 'ProtocolError'
  }
}

export class FrameTooLargeError extends ProtocolError {
  readonly actualLength: number
  readonly maxLength: number

  constructor(actualLength: number, maxLength: number) {
    super('FRAME_TOO_LARGE', `Frame size ${actualLength} exceeds max ${maxLength}`)
    this.name = 'FrameTooLargeError'
    this.actualLength = actualLength
    this.maxLength = maxLength
  }
}

export class FrameTooSmallError extends ProtocolError {
  readonly actualLength: number

  constructor(actualLength: number) {
    super('FRAME_TOO_SMALL', `Frame size ${actualLength} is below minimum (5)`)
    this.name = 'FrameTooSmallError'
    this.actualLength = actualLength
  }
}

export class FrameLengthMismatchError extends ProtocolError {
  readonly actualLength: number
  readonly expectedLength: number

  constructor(actualLength: number, expectedLength: number) {
    super(
      'FRAME_LENGTH_MISMATCH',
      `Frame buffer length ${actualLength} does not match LEN field expected ${expectedLength}`,
    )
    this.name = 'FrameLengthMismatchError'
    this.actualLength = actualLength
    this.expectedLength = expectedLength
  }
}

export class ChecksumError extends ProtocolError {
  readonly computed: number
  readonly received: number

  constructor(computed: number, received: number) {
    super(
      'CHECKSUM_MISMATCH',
      `Checksum mismatch: computed 0x${computed.toString(16).padStart(2, '0')}, received 0x${received.toString(16).padStart(2, '0')}`,
    )
    this.name = 'ChecksumError'
    this.computed = computed
    this.received = received
  }
}

export class InvalidAddressError extends ProtocolError {
  readonly input: string

  constructor(input: string) {
    super('INVALID_ADDRESS', `Cannot parse "${input}" as a device address`)
    this.name = 'InvalidAddressError'
    this.input = input
  }
}
