import type { DeviceAddress } from '@emdzej/ikbus-protocol'

/** Base class for runtime errors raised by the core. */
export class IKBusError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.code = code
    this.name = 'IKBusError'
  }
}

export class DuplicateDeviceError extends IKBusError {
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

export class TransportNotOpenError extends IKBusError {
  constructor() {
    super('TRANSPORT_NOT_OPEN', 'Transport is not open')
    this.name = 'TransportNotOpenError'
  }
}

export class DeviceNotAttachedError extends IKBusError {
  constructor() {
    super(
      'DEVICE_NOT_ATTACHED',
      'Device has not been attached to a bus yet; register it via IKBus.registerDevice first',
    )
    this.name = 'DeviceNotAttachedError'
  }
}
