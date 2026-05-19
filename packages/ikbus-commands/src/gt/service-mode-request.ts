import { DEVICE_ADDRESSES, type DeviceAddress, type IBusMessage } from '@emdzej/ibusx-protocol'
import { CommandPayloadError } from '../errors.js'
import { assertCommand, assertMinPayloadLength, makeMessage } from '../internal.js'

export const CMD_BMBT_SERVICE_REQUEST = 0x05

/**
 * Property IDs (payload[1]) in a BMBT Service-Mode request frame
 * (`0x05`).  Source: Wilhelm `gt/05.md`.
 *
 *   0x00  Ident Request           — no data
 *   0x0B  Key Function Request    — 1-byte data (observed: `0x01` = start)
 *   0x40  Brightness Request      — 1-byte data (observed: `0x01`)
 *   0x41  Brightness Set (BMBT)   — value byte follows the `0x01` qualifier
 *   0x42  Brightness Set (alt)    — same shape, observed on E85/E86 flip-up
 *                                   or RCM displays
 */
export const BMBT_SERVICE_PROPERTY = {
  IDENT_REQUEST: 0x00,
  KEY_FUNCTION_REQUEST: 0x0b,
  BRIGHTNESS_REQUEST: 0x40,
  BRIGHTNESS_SET_BMBT: 0x41,
  BRIGHTNESS_SET_ALT: 0x42,
} as const

export type BMBTServiceProperty = (typeof BMBT_SERVICE_PROPERTY)[keyof typeof BMBT_SERVICE_PROPERTY]

export interface BMBTServiceRequest {
  /** The property ID byte (`payload[1]`). */
  property: number
  /** Bytes after the property ID (`payload[2..]`).  Empty for ident requests. */
  data: Uint8Array
}

/**
 * Parse a `0x05` BMBT Service-Mode Request frame.  Default direction
 * GT (`0x3B`) → BMBT (`0xF0`).  Returns the raw property byte plus the
 * trailing data bytes for the caller to interpret per the property.
 */
export function parseBMBTServiceRequest(message: IBusMessage): BMBTServiceRequest {
  assertCommand(message, CMD_BMBT_SERVICE_REQUEST)
  assertMinPayloadLength(message, 2)
  const property = message.payload[1]!
  const data = message.payload.slice(2)
  return { property, data }
}

export interface BuildBMBTServiceRequestArgs {
  source?: DeviceAddress
  destination?: DeviceAddress
  property: number
  /** Bytes that follow the property ID.  Defaults to empty. */
  data?: ReadonlyArray<number> | Uint8Array
}

/** Build a `0x05` BMBT Service-Mode Request frame. */
export function buildBMBTServiceRequest(args: BuildBMBTServiceRequestArgs): IBusMessage {
  if (args.property < 0 || args.property > 0xff) {
    throw new CommandPayloadError(`Property ID 0x${args.property.toString(16)} out of byte range`)
  }
  const data = args.data ?? []
  const dataBytes = data instanceof Uint8Array ? Array.from(data) : Array.from(data)
  for (const b of dataBytes) {
    if (b < 0 || b > 0xff) {
      throw new CommandPayloadError(`Data byte 0x${b.toString(16)} out of byte range`)
    }
  }
  return makeMessage(
    args.source ?? DEVICE_ADDRESSES.GT,
    args.destination ?? DEVICE_ADDRESSES.BMBT,
    [CMD_BMBT_SERVICE_REQUEST, args.property & 0xff, ...dataBytes],
  )
}
