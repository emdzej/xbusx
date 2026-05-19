import { DEVICE_ADDRESSES, type DeviceAddress, type IKBusMessage } from '@emdzej/ikbus-protocol'
import { CommandPayloadError } from '../errors.js'
import { assertCommand, assertPayloadLength, makeMessage } from '../internal.js'

export const CMD_GT_MENU_SELECT = 0x20

/**
 * Menu selection broadcast from the GT (Graphics Terminal) when the user
 * picks an item from the main menu.
 *
 * Source: Wilhelm `telephone/20.md`.  The only documented use case is
 * the "Telephone" main-menu selection: `3B 05 FF 20 02 0C`.
 *
 * Direction GT (`0x3B`) → broadcast (`0xFF`).
 *
 * Wilhelm describes only the Telephone case authoritatively, with
 * `payload[1] = 0x02` and `payload[2] = 0x0C`.  Other selections may
 * use the same command with different byte pairs but those are not
 * documented in Wilhelm — we surface the two parameter bytes raw.
 */
export interface GTMenuSelect {
  /** First parameter byte. Observed as `0x02` for the Telephone selection. */
  param1: number
  /** Second parameter byte. Observed as `0x0C` for the Telephone selection. */
  param2: number
}

export function parseGTMenuSelect(message: IKBusMessage): GTMenuSelect {
  assertCommand(message, CMD_GT_MENU_SELECT)
  assertPayloadLength(message, 3)
  return {
    param1: message.payload[1]!,
    param2: message.payload[2]!,
  }
}

export interface BuildGTMenuSelectArgs {
  source?: DeviceAddress
  destination?: DeviceAddress
  param1: number
  param2: number
}

/** Convenience constants for the only Wilhelm-documented menu selection. */
export const GT_MENU_SELECT_TELEPHONE = { param1: 0x02, param2: 0x0c } as const

export function buildGTMenuSelect(args: BuildGTMenuSelectArgs): IKBusMessage {
  if (args.param1 < 0 || args.param1 > 0xff) {
    throw new CommandPayloadError(`param1 0x${args.param1.toString(16)} out of byte range`)
  }
  if (args.param2 < 0 || args.param2 > 0xff) {
    throw new CommandPayloadError(`param2 0x${args.param2.toString(16)} out of byte range`)
  }
  return makeMessage(args.source ?? DEVICE_ADDRESSES.GT, args.destination ?? DEVICE_ADDRESSES.LOC, [
    CMD_GT_MENU_SELECT,
    args.param1 & 0xff,
    args.param2 & 0xff,
  ])
}
