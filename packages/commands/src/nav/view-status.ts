import { DEVICE_ADDRESSES, type DeviceAddress, type IBusMessage } from '@emdzej/ibusx-protocol'
import { assertCommand, assertPayloadLength, makeMessage } from '../internal.js'

export const CMD_NAV_VIEW_STATUS = 0xab

/**
 * Navigation View Status broadcast.  Used by the GTF (rear-screen
 * graphics stage) to decide whether to pass GT/NAV video through to
 * the rear monitor.
 *
 * Source: Wilhelm `nav/ab.md`.  Direction NAV (`0x7F`) → GTF (`0x43`).
 * Single-byte payload.
 */
export interface NAVViewStatus {
  /** Wilhelm: bit set when focusing nav or rendering main menu.  Use unclear. */
  unknownFlag: boolean
  /** Bit set when nav view is NOT focused. */
  navNotFocused: boolean
  rawByte: number
}

export function parseNAVViewStatus(message: IBusMessage): NAVViewStatus {
  assertCommand(message, CMD_NAV_VIEW_STATUS)
  assertPayloadLength(message, 2)
  const b = message.payload[1]!
  return {
    unknownFlag: (b & 0x01) !== 0,
    navNotFocused: (b & 0x20) !== 0,
    rawByte: b,
  }
}

export interface BuildNAVViewStatusArgs {
  source?: DeviceAddress
  destination?: DeviceAddress
  unknownFlag?: boolean
  navNotFocused?: boolean
}

export function buildNAVViewStatus(args: BuildNAVViewStatusArgs): IBusMessage {
  let b = 0
  if (args.unknownFlag) b |= 0x01
  if (args.navNotFocused) b |= 0x20
  return makeMessage(
    args.source ?? DEVICE_ADDRESSES.NAV,
    args.destination ?? DEVICE_ADDRESSES.GTF,
    [CMD_NAV_VIEW_STATUS, b & 0xff],
  )
}
