import { DEVICE_ADDRESSES, type DeviceAddress, type IKBusMessage } from '@emdzej/ikbus-protocol'
import { assertCommand, assertMinPayloadLength, makeMessage } from '../internal.js'

export const CMD_NAV_CONTROL = 0xaa

/**
 * `0xAA` Navigation Control.
 *
 * Source: Wilhelm `nav/aa.md`.  Two senders with different vocabulary:
 *
 *   GTF (`0x43`) → NAV (`0x7F`)  — focus nav applet only (any data byte)
 *   SES (`0xB0`) → NAV (`0x7F`)  — full control: focus, map scale, POI
 *
 * Per Wilhelm: the SES command supports byte `0x10` (map scale) and
 * `0x20` (POI browser) families, each with a second byte selecting the
 * variant.  We surface the raw control bytes and provide named
 * constants for the SES values; consumers can compose as needed.
 */
export const NAV_CONTROL_GROUP_FOCUS = 0x02
export const NAV_CONTROL_GROUP_FOCUS_MAP = 0x04
export const NAV_CONTROL_GROUP_MAP_SCALE = 0x10
export const NAV_CONTROL_GROUP_POI = 0x20

export const NAV_MAP_SCALE = {
  M_100: 0x01,
  M_200: 0x02,
  M_500: 0x04,
  KM_1: 0x10,
  KM_2: 0x11,
  KM_5: 0x12,
  KM_10: 0x13,
  KM_20: 0x14,
  KM_50: 0x15,
  KM_100: 0x16,
  KM_200: 0x18,
  KM_500: 0x19,
  KM_1000: 0x1a,
} as const

export const NAV_POI = {
  HOTELS_AT_DESTINATION: 0x00,
  HOTELS_AT_CURRENT: 0x01,
  PETROL_AT_DESTINATION: 0x02,
  PETROL_AT_CURRENT: 0x03,
  PARKING_AT_DESTINATION: 0x04,
  PARKING_AT_CURRENT: 0x05,
  RESTAURANTS_AT_DESTINATION: 0x06,
  RESTAURANTS_AT_CURRENT: 0x07,
} as const

export interface NAVControl {
  /** Raw payload bytes after the command (`payload[1..]`). */
  data: Uint8Array
}

export function parseNAVControl(message: IKBusMessage): NAVControl {
  assertCommand(message, CMD_NAV_CONTROL)
  assertMinPayloadLength(message, 2)
  return { data: message.payload.slice(1) }
}

export interface BuildNAVControlArgs {
  source?: DeviceAddress
  destination?: DeviceAddress
  data: ReadonlyArray<number> | Uint8Array
}

export function buildNAVControl(args: BuildNAVControlArgs): IKBusMessage {
  return makeMessage(
    args.source ?? DEVICE_ADDRESSES.SES,
    args.destination ?? DEVICE_ADDRESSES.NAV,
    [CMD_NAV_CONTROL, ...Array.from(args.data)],
  )
}
