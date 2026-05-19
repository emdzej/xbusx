import { DEVICE_ADDRESSES, type DeviceAddress, type IKBusMessage } from '@emdzej/ikbus-protocol'
import { CommandPayloadError } from '../errors.js'
import { assertCommand, assertMinPayloadLength, makeMessage } from '../internal.js'

export const CMD_IKE_OBC_TEXT = 0x24

/**
 * Property ID in payload[1].  See Wilhelm `ike/24.md` for the canonical
 * list.  IDs not enumerated here ARE observed in practice on some chassis;
 * pass through `IKEOBCTextFrame.propertyId` as a number rather than relying
 * on the named subset.
 */
export const IKE_OBC_PROPERTY = {
  TIME: 0x01,
  DATE: 0x02,
  TEMPERATURE: 0x03,
  CONSUMPTION_1: 0x04,
  CONSUMPTION_2: 0x05,
  RANGE: 0x06,
  DISTANCE: 0x07,
  ARRIVAL: 0x08,
  LIMIT: 0x09,
  AVG_SPEED: 0x0a,
  TIMER: 0x0e,
  AUX_TIMER_1: 0x0f,
  AUX_TIMER_2: 0x10,
  CODE_EMERGENCY_DEACTIVATION: 0x16,
  TIMER_LAP: 0x1a,
} as const

export interface IKEOBCTextFrame {
  /** The property byte from `payload[1]`. */
  propertyId: number
  /** ASCII-decoded display string (trailing spaces trimmed). */
  text: string
}

/**
 * Parse a `0x24` OBC-text broadcast from IKE → displays.  Frame layout
 * is `0x24 | propertyId | 0x00 | <ASCII text...>`.
 */
export function parseIKEOBCText(message: IKBusMessage): IKEOBCTextFrame {
  assertCommand(message, CMD_IKE_OBC_TEXT)
  assertMinPayloadLength(message, 3)
  const propertyId = message.payload[1]!
  // payload[2] is documented as 0x00.
  const textBytes = message.payload.slice(3)
  let end = textBytes.length
  while (end > 0 && textBytes[end - 1] === 0x20) end -= 1
  let text = ''
  for (let i = 0; i < end; i++) text += String.fromCharCode(textBytes[i]!)
  return { propertyId, text }
}

export interface BuildIKEOBCTextArgs {
  source?: DeviceAddress
  destination?: DeviceAddress
  /** Either the raw byte or one of the named `IKE_OBC_PROPERTY.*` values. */
  propertyId: number
  /** Display text.  ASCII only — multi-byte encodings throw. */
  text: string
}

/**
 * Build a `0x24` OBC-text broadcast.  Default direction: IKE → display
 * multicast (`ANZV` 0xE7).
 */
export function buildIKEOBCText(args: BuildIKEOBCTextArgs): IKBusMessage {
  if (args.propertyId < 0 || args.propertyId > 0xff) {
    throw new CommandPayloadError(`Property ID ${args.propertyId} out of byte range`)
  }
  const encoded: number[] = []
  for (let i = 0; i < args.text.length; i++) {
    const cp = args.text.charCodeAt(i)
    if (cp > 0x7f) {
      throw new CommandPayloadError(
        'OBC text contains non-ASCII characters; per Wilhelm `ike/24.md` only ASCII is supported',
      )
    }
    encoded.push(cp)
  }
  return makeMessage(
    args.source ?? DEVICE_ADDRESSES.IKE,
    args.destination ?? DEVICE_ADDRESSES.ANZV,
    [CMD_IKE_OBC_TEXT, args.propertyId & 0xff, 0x00, ...encoded],
  )
}
