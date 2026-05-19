import { DEVICE_ADDRESSES, type DeviceAddress, type IBusMessage } from '@emdzej/ibusx-protocol'
import { assertCommand, assertPayloadLength, makeMessage } from '../internal.js'

export const CMD_PONG = 0x02

/**
 * The `0x02` byte after the command serves two purposes:
 *   - bit 0 (`0x01`) = announce flag (1 = announce, 0 = pong reply)
 *   - bits 3-7 (`0xF8`) = device-variant signature
 *
 * Per Wilhelm `02.md` the variant byte values vary per device:
 *   BMBT 4x3       = 0x00
 *   BMBT 16x9 tape = 0x30
 *   BMBT 16x9 CD   = 0x70
 *   BMBT 16x9 MD   = 0xB0
 *   TEL CMT3000    = 0x00
 *   TEL Motorola V = 0x30
 *   TEL Everest BT = 0x38
 *   …
 *
 * This codec exposes the raw values without interpreting them.
 */

export interface PongFrame {
  /** True if the announce bit was set (device coming online); false for a pong reply. */
  isAnnounce: boolean
  /** Variant bits (the raw `byte & 0xF8`). */
  variantBits: number
  /** The full byte after the command, for low-level inspection. */
  rawByte: number
}

/** Parse a `0x02` Pong / Announce frame. */
export function parsePong(message: IBusMessage): PongFrame {
  assertCommand(message, CMD_PONG)
  assertPayloadLength(message, 2)
  const byte = message.payload[1]!
  return {
    isAnnounce: (byte & 0x01) !== 0,
    variantBits: byte & 0xf8,
    rawByte: byte,
  }
}

export interface BuildPongArgs {
  source: DeviceAddress
  destination?: DeviceAddress
  /** True for an announce (sets bit 0); false for a ping reply. */
  isAnnounce: boolean
  /** Variant bits — bits 3-7 only (will be masked to `0xF8`). */
  variantBits?: number
}

/** Build a `0x02` Pong / Announce frame.  Defaults destination to GLO (broadcast). */
export function buildPong(args: BuildPongArgs): IBusMessage {
  const variant = (args.variantBits ?? 0) & 0xf8
  const byte = variant | (args.isAnnounce ? 0x01 : 0x00)
  return makeMessage(args.source, args.destination ?? DEVICE_ADDRESSES.GLO, [CMD_PONG, byte])
}
