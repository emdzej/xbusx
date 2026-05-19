/** 8-bit device address on the I/K-bus. Valid values are 0..255. */
export type DeviceAddress = number

/**
 * A parsed I/K-bus frame. `payload` is the bytes between `LEN` and the
 * checksum — the first byte is the command, the rest are command parameters.
 */
export interface IBusMessage {
  readonly source: DeviceAddress
  readonly destination: DeviceAddress
  readonly payload: Uint8Array
  readonly checksum: number
}
