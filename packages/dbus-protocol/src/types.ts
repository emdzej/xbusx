/** 8-bit address on the D-bus. Valid values are 0..255. */
export type DeviceAddress = number

/**
 * A parsed D-bus (BMW DS2) frame.
 *
 *   DST | LEN | DATA... | XOR
 *
 * `destination` is the byte on the wire — the ECU address for requests
 * (tester → ECU), or the tester address `0xF1` for responses
 * (ECU → tester). `payload` is the bytes between `LEN` and the checksum;
 * its first byte is the command and the rest are parameters. There is **no
 * source byte** on the D-bus — direction is inferred from `destination`
 * relative to the tester address.
 */
export interface DBusMessage {
  readonly destination: DeviceAddress
  readonly payload: Uint8Array
  readonly checksum: number
}
