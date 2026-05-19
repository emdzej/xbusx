import { DEVICE_ADDRESSES, type DeviceAddress, type IKBusMessage } from '@emdzej/ikbus-protocol'
import { CommandPayloadError } from '../errors.js'
import { assertCommand, assertPayloadLength, makeMessage } from '../internal.js'

export const CMD_IKE_NUMERIC_WRITE = 0x44

/**
 * Sub-commands in payload[1] selecting the *mode* of the numeric display.
 * Names match BlueBus's `IBUS_DATA_IKE_NUMERIC_*` constants.
 *
 *   0x20 — clear the numeric display
 *   0x21 — show as ×1 with a trailing "M" suffix
 *   0x23 — show as ×1 (no suffix)
 *   0x25 — show as ×100 with a trailing "M" suffix
 */
export const IKE_NUMERIC_CLEAR = 0x20
export const IKE_NUMERIC_X1_M = 0x21
export const IKE_NUMERIC_X1 = 0x23
export const IKE_NUMERIC_X100_M = 0x25

export type IKENumericMode =
  | typeof IKE_NUMERIC_CLEAR
  | typeof IKE_NUMERIC_X1_M
  | typeof IKE_NUMERIC_X1
  | typeof IKE_NUMERIC_X100_M

export interface IKENumericWrite {
  mode: IKENumericMode
  /** The decimal value 0..99 (`undefined` on a clear frame). */
  value: number | undefined
}

/**
 * Parse a `0x44` IKE numeric-write frame.  Frame layout: `0x44 | mode | bcd`.
 * `bcd` is `((value / 10) << 4) | (value % 10)` — i.e. each nibble holds
 * one decimal digit.
 */
export function parseIKENumeric(message: IKBusMessage): IKENumericWrite {
  assertCommand(message, CMD_IKE_NUMERIC_WRITE)
  assertPayloadLength(message, 3)
  const raw = message.payload[1]!
  if (raw === IKE_NUMERIC_CLEAR) {
    return { mode: IKE_NUMERIC_CLEAR, value: undefined }
  }
  if (raw !== IKE_NUMERIC_X1_M && raw !== IKE_NUMERIC_X1 && raw !== IKE_NUMERIC_X100_M) {
    throw new CommandPayloadError(`Unknown 0x44 numeric mode 0x${raw.toString(16)}`)
  }
  const mode: IKENumericMode = raw
  const bcd = message.payload[2]!
  const high = (bcd >> 4) & 0x0f
  const low = bcd & 0x0f
  if (high > 9 || low > 9) {
    throw new CommandPayloadError(`Invalid BCD byte 0x${bcd.toString(16)} in 0x44 frame`)
  }
  return { mode, value: high * 10 + low }
}

export interface BuildIKENumericArgs {
  source?: DeviceAddress
  destination?: DeviceAddress
  mode: IKENumericMode
  /** Required when `mode !== IKE_NUMERIC_CLEAR`.  Range 0..99. */
  value?: number
}

/** Build a `0x44` IKE numeric-write frame.  Direction PDC → IKE by default. */
export function buildIKENumeric(args: BuildIKENumericArgs): IKBusMessage {
  if (args.mode === IKE_NUMERIC_CLEAR) {
    return makeMessage(
      args.source ?? DEVICE_ADDRESSES.PDC,
      args.destination ?? DEVICE_ADDRESSES.IKE,
      [CMD_IKE_NUMERIC_WRITE, IKE_NUMERIC_CLEAR, 0x00],
    )
  }
  const value = args.value
  if (value === undefined) {
    throw new CommandPayloadError('Numeric value required for non-clear modes')
  }
  if (!Number.isInteger(value) || value < 0 || value > 99) {
    throw new CommandPayloadError(`Numeric value ${value} out of range 0..99`)
  }
  const bcd = (Math.floor(value / 10) << 4) | (value % 10)
  return makeMessage(
    args.source ?? DEVICE_ADDRESSES.PDC,
    args.destination ?? DEVICE_ADDRESSES.IKE,
    [CMD_IKE_NUMERIC_WRITE, args.mode, bcd & 0xff],
  )
}
