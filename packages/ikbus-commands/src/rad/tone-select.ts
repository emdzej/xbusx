import { DEVICE_ADDRESSES, type DeviceAddress, type IKBusMessage } from '@emdzej/ikbus-protocol'
import { CommandPayloadError } from '../errors.js'
import { assertCommand, assertMinPayloadLength, makeMessage } from '../internal.js'

export const CMD_RAD_TONE_SELECT = 0x37

/**
 * `0x37` Radio Tone/Select — radio loads the Tone (EQ) or Select
 * (playback options) menu on the GT.  Layout varies by FUNCTION:
 *
 *   FUNCTION_SELECT_NG (`0b00`)  — short 1-byte payload with ROW |
 *                                  SOURCE | OPTS sub-fields.
 *   FUNCTION_SELECT    (`0b01`)  — short 1-byte payload, legacy radios.
 *   FUNCTION_TONE_SET  (`0b10`)  — extended 4-byte payload encoding
 *                                  bass/treble/fader/balance values.
 *   FUNCTION_TONE      (`0b11`)  — short 1-byte payload, tone menu.
 *
 * Source: Wilhelm `radio/37.md`.  Direction Radio (`0x68`) → GT (`0x3B`).
 *
 * Because the bit layout depends on the function, we surface the raw
 * bytes plus the top-level FUNCTION discriminator.  Callers needing
 * the inner fields (ROW, SOURCE, etc.) read them out of the raw byte
 * using the `RAD_TONE_SELECT_*` constants below.
 */
export const RAD_TONE_SELECT_FUNCTION = {
  SELECT_NG: 0x00,
  SELECT: 0x40,
  TONE_SET: 0x80,
  TONE: 0xc0,
} as const

export const RAD_TONE_SELECT_FUNCTION_MASK = 0xc0
export const RAD_TONE_SELECT_ROW_MASK = 0x30
export const RAD_TONE_SELECT_SOURCE_MASK = 0x08
export const RAD_TONE_SELECT_OPTS_MASK = 0x07

export interface RADToneSelect {
  /** First payload byte (`payload[1]`).  High 2 bits = FUNCTION. */
  controlByte: number
  /** FUNCTION sub-field. */
  function: number
  /**
   * Trailing bytes after the control byte.  Empty for short frames,
   * 3-byte BCD-packed tone values for `TONE_SET`.
   */
  extra: Uint8Array
}

export function parseRADToneSelect(message: IKBusMessage): RADToneSelect {
  assertCommand(message, CMD_RAD_TONE_SELECT)
  assertMinPayloadLength(message, 2)
  const controlByte = message.payload[1]!
  return {
    controlByte,
    function: controlByte & RAD_TONE_SELECT_FUNCTION_MASK,
    extra: message.payload.slice(2),
  }
}

export interface BuildRADToneSelectArgs {
  source?: DeviceAddress
  destination?: DeviceAddress
  controlByte: number
  extra?: ReadonlyArray<number> | Uint8Array
}

export function buildRADToneSelect(args: BuildRADToneSelectArgs): IKBusMessage {
  if (args.controlByte < 0 || args.controlByte > 0xff) {
    throw new CommandPayloadError(
      `controlByte 0x${args.controlByte.toString(16)} out of byte range`,
    )
  }
  const extra = args.extra ? Array.from(args.extra) : []
  for (const b of extra) {
    if (b < 0 || b > 0xff) {
      throw new CommandPayloadError(`extra byte 0x${b.toString(16)} out of byte range`)
    }
  }
  return makeMessage(args.source ?? DEVICE_ADDRESSES.RAD, args.destination ?? DEVICE_ADDRESSES.GT, [
    CMD_RAD_TONE_SELECT,
    args.controlByte & 0xff,
    ...extra,
  ])
}
