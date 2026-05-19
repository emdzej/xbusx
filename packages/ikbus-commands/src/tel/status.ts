import { DEVICE_ADDRESSES, type DeviceAddress, type IBusMessage } from '@emdzej/ibusx-protocol'
import { assertCommand, assertPayloadLength, makeMessage } from '../internal.js'

export const CMD_TEL_STATUS = 0x2c

/**
 * Telephone status bitfield (per BlueBus `ibus.h:486-489`).  The byte is a
 * combination of independent flags.
 */
export const TEL_STATUS_BITS = {
  HANDSFREE: 0x01,
  ESTABLISHING_CALL: 0x04,
  POWER: 0x10,
  ON_CALL: 0x20,
} as const

export interface TelStatus {
  /** Audio routed to speakers, not handset. */
  handsfree: boolean
  /** Incoming or outgoing call ringing. */
  establishingCall: boolean
  /** Telephone module powered. */
  power: boolean
  /** Active call. */
  onCall: boolean
  rawByte: number
}

/** Parse a `0x2C` telephone-status frame (TEL → displays multicast). */
export function parseTelStatus(message: IBusMessage): TelStatus {
  assertCommand(message, CMD_TEL_STATUS)
  assertPayloadLength(message, 2)
  const byte = message.payload[1]!
  return {
    handsfree: (byte & TEL_STATUS_BITS.HANDSFREE) !== 0,
    establishingCall: (byte & TEL_STATUS_BITS.ESTABLISHING_CALL) !== 0,
    power: (byte & TEL_STATUS_BITS.POWER) !== 0,
    onCall: (byte & TEL_STATUS_BITS.ON_CALL) !== 0,
    rawByte: byte,
  }
}

export interface BuildTelStatusArgs {
  source?: DeviceAddress
  destination?: DeviceAddress
  handsfree?: boolean
  establishingCall?: boolean
  power?: boolean
  onCall?: boolean
}

/** Build a `0x2C` telephone-status frame.  Defaults source to TEL, dest to ANZV. */
export function buildTelStatus(args: BuildTelStatusArgs): IBusMessage {
  const byte =
    (args.handsfree ? TEL_STATUS_BITS.HANDSFREE : 0) |
    (args.establishingCall ? TEL_STATUS_BITS.ESTABLISHING_CALL : 0) |
    (args.power ? TEL_STATUS_BITS.POWER : 0) |
    (args.onCall ? TEL_STATUS_BITS.ON_CALL : 0)
  return makeMessage(
    args.source ?? DEVICE_ADDRESSES.TEL,
    args.destination ?? DEVICE_ADDRESSES.ANZV,
    [CMD_TEL_STATUS, byte],
  )
}
