import { DEVICE_ADDRESSES, type DeviceAddress, type IKBusMessage } from '@emdzej/ikbus-protocol'
import { CommandPayloadError } from '../errors.js'
import { assertCommand, assertMinPayloadLength, makeMessage } from '../internal.js'

export const CMD_TEL_DIRECT_DIAL = 0x2d

/**
 * `0x2D` Direct Dial — GT instructs the Telephone to dial a number
 * directly without going through the GT's dial UI.
 *
 * Source: Wilhelm `telephone/2d.md`.  Direction GT (`0x3B`) → Telephone
 * (`0xC8`).  Per Wilhelm, only works with BMW Assist-compatible phone
 * modules.
 *
 * Frame layout: `[0x2D, 0x00, 0x11, ...ASCII phone number...]`
 * The two opaque header bytes after the command are surfaced raw
 * because Wilhelm doesn't break them down.
 */
export interface TELDirectDial {
  /** Wilhelm-observed header bytes (always `0x00 0x11`). */
  reservedHeader: readonly [number, number]
  /** The ASCII-decoded phone number (e.g. "+4989125016000"). */
  phoneNumber: string
}

export function parseTELDirectDial(message: IKBusMessage): TELDirectDial {
  assertCommand(message, CMD_TEL_DIRECT_DIAL)
  // cmd + 2 header bytes + ≥ 1 digit
  assertMinPayloadLength(message, 4)
  const h1 = message.payload[1]!
  const h2 = message.payload[2]!
  let phone = ''
  for (let i = 3; i < message.payload.length; i++) {
    const cp = message.payload[i]!
    if (cp === 0) break
    phone += String.fromCharCode(cp)
  }
  return { reservedHeader: [h1, h2], phoneNumber: phone }
}

export interface BuildTELDirectDialArgs {
  source?: DeviceAddress
  destination?: DeviceAddress
  phoneNumber: string
  /** Defaults to `[0x00, 0x11]` from Wilhelm's worked examples. */
  reservedHeader?: readonly [number, number]
}

export function buildTELDirectDial(args: BuildTELDirectDialArgs): IKBusMessage {
  const header = args.reservedHeader ?? ([0x00, 0x11] as const)
  const bytes: number[] = [CMD_TEL_DIRECT_DIAL, header[0] & 0xff, header[1] & 0xff]
  for (let i = 0; i < args.phoneNumber.length; i++) {
    const cp = args.phoneNumber.charCodeAt(i)
    if (cp > 0x7f) {
      throw new CommandPayloadError(
        `Phone number must be ASCII (U+${cp.toString(16).padStart(4, '0')} not allowed)`,
      )
    }
    bytes.push(cp)
  }
  return makeMessage(
    args.source ?? DEVICE_ADDRESSES.GT,
    args.destination ?? DEVICE_ADDRESSES.TEL,
    bytes,
  )
}
