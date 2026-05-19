import { DEVICE_ADDRESSES, type DeviceAddress, type IBusMessage } from '@emdzej/ibusx-protocol'
import { CommandPayloadError } from '../errors.js'
import { assertCommand, assertMinPayloadLength, makeMessage } from '../internal.js'

export const CMD_DEVICE_RESET = 0x1c

/**
 * `0x1C` Device Reset.
 *
 * Source: **navcoder** (`ibus.bas:17823–17893`).  navcoder calls this
 * byte "Gong" in its command-name table (`Proc_5_4_498820`), but the
 * actual parser at `Proc_5_7_4A6450` (line 17823+) recognises the
 * specific 2-byte payload `[0x1C, 0x00]` as **"Device reset"** — other
 * payloads are dumped as opaque hex with no semantic.
 *
 * Per the project's "navcoder is authoritative for working code"
 * directive: we follow the parser, not the name table.  The codec
 * surfaces `subkind: 'device-reset' | 'unknown'` plus the raw bytes
 * so callers can either react to the canonical reset or pass the
 * unknown variant through.
 *
 * Neither BlueBus nor Wilhelm-docs document this frame.
 */
export type IKEDeviceResetSubkind = 'device-reset' | 'unknown'

export interface IKEDeviceReset {
  subkind: IKEDeviceResetSubkind
  /** Bytes after the command (`payload[1..]`). */
  data: Uint8Array
}

export function parseIKEDeviceReset(message: IBusMessage): IKEDeviceReset {
  assertCommand(message, CMD_DEVICE_RESET)
  assertMinPayloadLength(message, 2)
  const data = message.payload.slice(1)
  // navcoder's parser: len(data) == 1 AND first byte == 0x00 → "Device reset".
  // Any other payload → unknown / raw passthrough.
  const subkind: IKEDeviceResetSubkind =
    data.length === 1 && data[0] === 0x00 ? 'device-reset' : 'unknown'
  return { subkind, data }
}

export interface BuildIKEDeviceResetArgs {
  source?: DeviceAddress
  destination?: DeviceAddress
  /**
   * Defaults to the canonical "Device reset" form (`[0x00]`).  Pass
   * other bytes to construct the "unknown" variant — note navcoder
   * has no parsing for those.
   */
  data?: ReadonlyArray<number> | Uint8Array
}

export function buildIKEDeviceReset(args: BuildIKEDeviceResetArgs = {}): IBusMessage {
  const data = args.data ? Array.from(args.data) : [0x00]
  if (data.length === 0) {
    throw new CommandPayloadError('0x1C requires at least one data byte')
  }
  for (const b of data) {
    if (b < 0 || b > 0xff) {
      throw new CommandPayloadError(`Data byte 0x${b.toString(16)} out of byte range`)
    }
  }
  return makeMessage(
    args.source ?? DEVICE_ADDRESSES.DIA,
    args.destination ?? DEVICE_ADDRESSES.GLO,
    [CMD_DEVICE_RESET, ...data],
  )
}
