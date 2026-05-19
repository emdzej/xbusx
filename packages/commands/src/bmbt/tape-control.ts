import { DEVICE_ADDRESSES, type DeviceAddress, type IBusMessage } from '@emdzej/ibusx-protocol'
import { CommandPayloadError } from '../errors.js'
import { assertCommand, assertPayloadLength, makeMessage } from '../internal.js'

export const CMD_BMBT_TAPE_LED_CONTROL = 0x4a

/**
 * `0x4A` BMBT Tape/LED Control — radio addresses the BMBT to drive the
 * tape mechanism and the radio LED.  One-byte payload after the command.
 *
 * Source: Wilhelm `bmbt/4a.md`.  Direction Radio (`0x68`) → BMBT
 * (`0xF0`).  Wilhelm notes "no bitfields this time — the command bytes
 * are hardcoded in the radio's firmware".
 */
export const BMBT_TAPE_LED_CONTROL = {
  LED_OFF: 0x00,
  LED_ON: 0xff,
  EJECT_TAPE: 0x40,
  COMMIT_OR_CANCEL: 0x41,
  FAST_FORWARD: 0x42,
  FAST_REWIND: 0x43,
  FORWARD: 0x44,
  REWIND: 0x45,
  STOP_MODE_CHANGE: 0x48,
  STOP: 0x4a,
  PLAY: 0x4b,
  TAPE_SIDE_1: 0x5a,
  TAPE_SIDE_2: 0x5b,
  DOLBY_MODE_B: 0x5d,
  DOLBY_MODE_C: 0x5e,
  DOLBY_OFF: 0x5f,
  /** Wilhelm marks this and 0x90 as "Unknown" but observed in traffic. */
  UNKNOWN_80: 0x80,
  /** Sent on radio power-on / mode switch to tape. */
  UNKNOWN_90: 0x90,
} as const

export type BMBTTapeLedCommand = (typeof BMBT_TAPE_LED_CONTROL)[keyof typeof BMBT_TAPE_LED_CONTROL]

export interface BMBTTapeLedControl {
  /** Raw command byte from the payload.  Match against `BMBT_TAPE_LED_CONTROL.*`. */
  command: number
}

export function parseBMBTTapeLedControl(message: IBusMessage): BMBTTapeLedControl {
  assertCommand(message, CMD_BMBT_TAPE_LED_CONTROL)
  assertPayloadLength(message, 2)
  return { command: message.payload[1]! }
}

export interface BuildBMBTTapeLedControlArgs {
  source?: DeviceAddress
  destination?: DeviceAddress
  command: number
}

export function buildBMBTTapeLedControl(args: BuildBMBTTapeLedControlArgs): IBusMessage {
  if (args.command < 0 || args.command > 0xff) {
    throw new CommandPayloadError(`command 0x${args.command.toString(16)} out of byte range`)
  }
  return makeMessage(
    args.source ?? DEVICE_ADDRESSES.RAD,
    args.destination ?? DEVICE_ADDRESSES.BMBT,
    [CMD_BMBT_TAPE_LED_CONTROL, args.command & 0xff],
  )
}
