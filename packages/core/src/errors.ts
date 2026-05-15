import type { DeviceAddress } from '@emdzej/ibusx-protocol'

/** Base class for runtime errors raised by the core. */
export class IBusError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.code = code
    this.name = 'IBusError'
  }
}

export class DuplicateDeviceError extends IBusError {
  readonly address: DeviceAddress

  constructor(address: DeviceAddress) {
    super(
      'DUPLICATE_DEVICE',
      `A device is already registered at address 0x${address.toString(16).padStart(2, '0').toUpperCase()}`,
    )
    this.name = 'DuplicateDeviceError'
    this.address = address
  }
}

export class TransportNotOpenError extends IBusError {
  constructor() {
    super('TRANSPORT_NOT_OPEN', 'Transport is not open')
    this.name = 'TransportNotOpenError'
  }
}

export class DeviceNotAttachedError extends IBusError {
  constructor() {
    super(
      'DEVICE_NOT_ATTACHED',
      'Device has not been attached to a bus yet; register it via IBus.registerDevice first',
    )
    this.name = 'DeviceNotAttachedError'
  }
}
