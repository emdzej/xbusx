import { DEVICE_ADDRESSES, type DeviceAddress, type IBusMessage } from '@emdzej/ibusx-protocol'
import { assertCommand, assertPayloadLength, makeMessage } from '../internal.js'

export const CMD_RAD_SCREEN_MODE = 0x46

/**
 * `0x46` screen-mode update / request-UI byte (radio → GT side of the
 * arbitration handshake).  The single payload byte is a bitmask documented
 * in BlueBus `ibus.h:255-257` and Wilhelm `radio/46.md`.
 */
export const SCREEN_MODE_BITS = {
  /** Radio claiming foreground (`IBUS_RAD_PRIORITY_RAD`). */
  PRIORITY_RAD: 0x01,
  /** Radio relinquishing to GT (`IBUS_RAD_PRIORITY_GT`). */
  PRIORITY_GT: 0x02,
  /** Hide the Select overlay. */
  HIDE_SELECT: 0x04,
  /** Hide the Tone overlay. */
  HIDE_TONE: 0x08,
  /** Hide the menu body (`IBUS_RAD_HIDE_BODY`). */
  HIDE_MENU: 0x0c,
} as const

export interface ScreenMode {
  priorityRad: boolean
  priorityGt: boolean
  hideSelect: boolean
  hideTone: boolean
  hideMenu: boolean
  /** Raw byte for callers that need to inspect undocumented bits. */
  rawByte: number
}

/** Parse a `0x46` screen-mode update from the radio. */
export function parseScreenMode(message: IBusMessage): ScreenMode {
  assertCommand(message, CMD_RAD_SCREEN_MODE)
  assertPayloadLength(message, 2)
  const byte = message.payload[1]!
  return {
    priorityRad: (byte & SCREEN_MODE_BITS.PRIORITY_RAD) !== 0,
    priorityGt: (byte & SCREEN_MODE_BITS.PRIORITY_GT) !== 0,
    hideSelect: (byte & SCREEN_MODE_BITS.HIDE_SELECT) !== 0,
    hideTone: (byte & SCREEN_MODE_BITS.HIDE_TONE) !== 0,
    // HIDE_MENU is HIDE_SELECT|HIDE_TONE (0x0C) — match exact pattern, not bit-subset.
    hideMenu: (byte & 0x0c) === 0x0c,
    rawByte: byte,
  }
}

export interface BuildScreenModeArgs {
  source?: DeviceAddress
  destination?: DeviceAddress
  /** When provided, takes precedence over the individual flags. */
  rawByte?: number
  priorityRad?: boolean
  priorityGt?: boolean
  hideSelect?: boolean
  hideTone?: boolean
  hideMenu?: boolean
}

/** Build a `0x46` screen-mode update from the radio. */
export function buildScreenMode(args: BuildScreenModeArgs): IBusMessage {
  let byte: number
  if (args.rawByte !== undefined) {
    byte = args.rawByte & 0xff
  } else {
    byte =
      (args.priorityRad ? SCREEN_MODE_BITS.PRIORITY_RAD : 0) |
      (args.priorityGt ? SCREEN_MODE_BITS.PRIORITY_GT : 0) |
      (args.hideMenu
        ? SCREEN_MODE_BITS.HIDE_MENU
        : (args.hideSelect ? SCREEN_MODE_BITS.HIDE_SELECT : 0) |
          (args.hideTone ? SCREEN_MODE_BITS.HIDE_TONE : 0))
  }
  return makeMessage(args.source ?? DEVICE_ADDRESSES.RAD, args.destination ?? DEVICE_ADDRESSES.GT, [
    CMD_RAD_SCREEN_MODE,
    byte,
  ])
}
