import { DEVICE_ADDRESSES, type DeviceAddress, type IKBusMessage } from '@emdzej/ikbus-protocol'
import { CommandPayloadError } from '../errors.js'
import { assertCommand, assertMinPayloadLength, makeMessage } from '../internal.js'

export const CMD_ODOMETER_REQUEST = 0x16
export const CMD_ODOMETER_STATUS = 0x17

/**
 * Parse a `0x17` odometer broadcast.  The mileage is a 3-byte little-endian
 * unsigned integer in kilometres (max ~16.7M km).
 */
export function parseOdometer(message: IKBusMessage): number {
  assertCommand(message, CMD_ODOMETER_STATUS)
  assertMinPayloadLength(message, 4)
  const lo = message.payload[1]!
  const mid = message.payload[2]!
  const hi = message.payload[3]!
  return (hi << 16) | (mid << 8) | lo
}

export interface BuildOdometerArgs {
  source?: DeviceAddress
  destination?: DeviceAddress
  /** Mileage in km (0..16_777_215). */
  km: number
  /**
   * Trailing bytes after the mileage triple.  Wilhelm's documented frames
   * include `00 1F 32 CC 01` after the 3-byte mileage; their meaning is not
   * documented.  Defaults to mimic that observed pattern.
   */
  tail?: ReadonlyArray<number>
}

/** Build a `0x17` odometer broadcast. */
export function buildOdometer(args: BuildOdometerArgs): IKBusMessage {
  if (args.km < 0 || args.km > 0xffffff) {
    throw new CommandPayloadError(`Odometer ${args.km} km out of range (0..${0xffffff})`)
  }
  const km = Math.round(args.km)
  const lo = km & 0xff
  const mid = (km >> 8) & 0xff
  const hi = (km >> 16) & 0xff
  const tail = args.tail ?? [0x00, 0x1f, 0x32, 0xcc, 0x01]
  return makeMessage(
    args.source ?? DEVICE_ADDRESSES.IKE,
    args.destination ?? DEVICE_ADDRESSES.GLO,
    [CMD_ODOMETER_STATUS, lo, mid, hi, ...tail],
  )
}

export interface BuildOdometerRequestArgs {
  source: DeviceAddress
  destination?: DeviceAddress
}

/** Build a `0x16` request asking the IKE to broadcast its odometer. */
export function buildOdometerRequest(args: BuildOdometerRequestArgs): IKBusMessage {
  return makeMessage(args.source, args.destination ?? DEVICE_ADDRESSES.IKE, [CMD_ODOMETER_REQUEST])
}
