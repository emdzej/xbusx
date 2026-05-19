import { DEVICE_ADDRESSES, type DeviceAddress, type IKBusMessage } from '@emdzej/ikbus-protocol'
import { CommandPayloadError } from '../errors.js'
import { assertCommand, assertPayloadLength, makeMessage } from '../internal.js'

export const CMD_RAD_EQ = 0x36

/**
 * `0x36` Radio EQ — Tone (EQ) display update from Radio to GT.
 *
 * Source: Wilhelm `radio/36.md`.  Direction Radio (`0x68`) → GT
 * (`0x3B`).  BMBT only.
 *
 * One-byte payload: high 3 bits = PROPERTY, low 5 bits = VALUE
 * (signed-magnitude).  Wilhelm warns that the encoding is non-linear:
 * the magnitude bytes do NOT correspond directly to step numbers.
 * Callers needing UI-step semantics must use the per-property tables
 * below.
 */
export const RAD_EQ_PROPERTY = {
  BALANCE: 0x40,
  BASS: 0x60,
  FADER: 0x80,
  TREBLE: 0xc0,
} as const

export type RADEqProperty = (typeof RAD_EQ_PROPERTY)[keyof typeof RAD_EQ_PROPERTY]

export interface RADEqUpdate {
  /** One of the four EQ properties; raw 3-bit value if unknown. */
  property: number
  /** Raw 5-bit magnitude+sign value (Wilhelm: `0b001SMAGN`). */
  rawValue: number
  /** Signed-magnitude decoded value (sign-bit 0x10, magnitude low 4 bits). */
  sign: 'positive' | 'negative'
  magnitude: number
  rawByte: number
}

export function parseRADEqUpdate(message: IKBusMessage): RADEqUpdate {
  assertCommand(message, CMD_RAD_EQ)
  assertPayloadLength(message, 2)
  const byte = message.payload[1]!
  const property = byte & 0xe0
  const rawValue = byte & 0x1f
  const sign = (rawValue & 0x10) !== 0 ? 'negative' : 'positive'
  const magnitude = rawValue & 0x0f
  return { property, rawValue, sign, magnitude, rawByte: byte }
}

export interface BuildRADEqUpdateArgs {
  source?: DeviceAddress
  destination?: DeviceAddress
  property: number
  /** Raw 5-bit value (sign bit `0x10` | magnitude low 4).  Per Wilhelm
   *  the encoding is non-linear; use the table values from `radio/36.md`. */
  rawValue: number
}

export function buildRADEqUpdate(args: BuildRADEqUpdateArgs): IKBusMessage {
  if ((args.property & ~0xe0) !== 0) {
    throw new CommandPayloadError(`property byte 0x${args.property.toString(16)} has low bits set`)
  }
  if (args.rawValue < 0 || args.rawValue > 0x1f) {
    throw new CommandPayloadError(`rawValue 0x${args.rawValue.toString(16)} out of 5-bit range`)
  }
  return makeMessage(args.source ?? DEVICE_ADDRESSES.RAD, args.destination ?? DEVICE_ADDRESSES.GT, [
    CMD_RAD_EQ,
    (args.property | args.rawValue) & 0xff,
  ])
}
