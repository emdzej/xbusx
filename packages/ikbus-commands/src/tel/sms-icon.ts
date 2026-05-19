import { DEVICE_ADDRESSES, type DeviceAddress, type IBusMessage } from '@emdzej/ibusx-protocol'
import { assertCommand, assertPayloadLength, makeMessage } from '../internal.js'

export const CMD_TEL_SMS_ICON = 0xa6

/**
 * Show / hide the SMS unread-message icon on the display.
 *
 * Source: Wilhelm `telephone/a6.md`.  Frame: `[0xA6, 0x00, on]`.
 * Direction TEL (`0xC8`) → ANZV display multicast (`0xE7`).  The first
 * data byte (`payload[1]`) is observed as `0x00` in every Wilhelm example
 * and is surfaced raw as `reserved` so callers don't lose it on
 * round-trip if they ever see something non-zero.
 */
export interface TELSMSIcon {
  /** `true` to show the icon, `false` to hide it. */
  visible: boolean
  /** Always `0x00` in observed frames; surfaced raw for forwards-compatibility. */
  reserved: number
}

export function parseTELSMSIcon(message: IBusMessage): TELSMSIcon {
  assertCommand(message, CMD_TEL_SMS_ICON)
  assertPayloadLength(message, 3)
  return {
    reserved: message.payload[1]!,
    visible: message.payload[2] === 0x01,
  }
}

export interface BuildTELSMSIconArgs {
  source?: DeviceAddress
  destination?: DeviceAddress
  visible: boolean
  reserved?: number
}

export function buildTELSMSIcon(args: BuildTELSMSIconArgs): IBusMessage {
  return makeMessage(
    args.source ?? DEVICE_ADDRESSES.TEL,
    args.destination ?? DEVICE_ADDRESSES.ANZV,
    [CMD_TEL_SMS_ICON, (args.reserved ?? 0x00) & 0xff, args.visible ? 0x01 : 0x00],
  )
}
