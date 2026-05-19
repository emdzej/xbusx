/** Base class for every error this package throws. */
export class DBusDeviceError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.code = code
    this.name = 'DBusDeviceError'
  }
}

/** A request was made before the transport was opened. */
export class DBusNotStartedError extends DBusDeviceError {
  constructor() {
    super('DBUS_NOT_STARTED', 'DBus.start() must be called before issuing requests')
    this.name = 'DBusNotStartedError'
  }
}

/** No response arrived within the timeout window. */
export class DBusRequestTimeoutError extends DBusDeviceError {
  readonly destination: number
  readonly timeoutMs: number

  constructor(destination: number, timeoutMs: number) {
    super(
      'DBUS_REQUEST_TIMEOUT',
      `No response from 0x${destination.toString(16).padStart(2, '0').toUpperCase()} within ${timeoutMs}ms`,
    )
    this.name = 'DBusRequestTimeoutError'
    this.destination = destination
    this.timeoutMs = timeoutMs
  }
}

/** The ECU answered with a non-positive DS2 response code. */
export class DBusNegativeResponseError extends DBusDeviceError {
  readonly responseCode: number
  readonly data: Uint8Array

  constructor(responseCode: number, data: Uint8Array) {
    super(
      'DBUS_NEGATIVE_RESPONSE',
      `ECU responded negatively with 0x${responseCode.toString(16).padStart(2, '0').toUpperCase()}`,
    )
    this.name = 'DBusNegativeResponseError'
    this.responseCode = responseCode
    this.data = data
  }
}
