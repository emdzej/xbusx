import { DEVICE_ADDRESSES, type DeviceAddress, type IKBusMessage } from '@emdzej/ikbus-protocol'
import { CommandPayloadError } from '../errors.js'
import { assertCommand, assertPayloadLength, makeMessage } from '../internal.js'

export const CMD_IKE_OBC_REMOTE_CONFIG = 0x42

/**
 * The "Remote Control" function selector for the high-cluster (IKE)
 * character display.  Carries a fixed-length 12-slot list of function
 * codes; unused slots take the void byte `0xFF`.
 *
 * Source: Wilhelm `ike/42.md`.  Two directions, same wire format:
 *
 *   IKE (0x80) → GT (0x3B): edit — IKE pushes its current config to GT
 *   GT (0x3B) → IKE (0x80): memorise — user saves selection back
 *
 * The selected functions are recalled in slot order on the high-cluster
 * character display.
 */
export const IKE_OBC_FUNCTION = {
  TIME: 0x01,
  DATE: 0x02,
  CONSUMP_1: 0x04,
  CONSUMP_2: 0x05,
  RANGE: 0x06,
  DISTANCE: 0x07,
  ARRIVAL: 0x08,
  LIMIT: 0x09,
  AVG_SPEED: 0x0a,
  TIMER: 0x0e,
  AUX_TIMER_1: 0x0f,
  AUX_TIMER_2: 0x10,
  VOID: 0xff,
} as const

export type IKEOBCFunction = (typeof IKE_OBC_FUNCTION)[keyof typeof IKE_OBC_FUNCTION]

export interface IKEOBCRemoteConfig {
  /**
   * Exactly 12 byte slots.  Each slot holds either a function code from
   * `IKE_OBC_FUNCTION.*` or `0xFF` (`VOID`).  Trailing `0xFF`s indicate
   * unused slots.  The active functions are recalled in the order they
   * appear.
   */
  slots: ReadonlyArray<number>
}

export const IKE_OBC_REMOTE_CONFIG_SLOTS = 12

export function parseIKEOBCRemoteConfig(message: IKBusMessage): IKEOBCRemoteConfig {
  assertCommand(message, CMD_IKE_OBC_REMOTE_CONFIG)
  // 1 byte command + 12 bytes data = 13-byte payload
  assertPayloadLength(message, 1 + IKE_OBC_REMOTE_CONFIG_SLOTS)
  return { slots: Array.from(message.payload.slice(1)) }
}

export interface BuildIKEOBCRemoteConfigArgs {
  source?: DeviceAddress
  destination?: DeviceAddress
  /**
   * Up to 12 function codes.  Any slots beyond what's supplied are
   * filled with `IKE_OBC_FUNCTION.VOID` (`0xFF`).
   */
  slots: ReadonlyArray<number>
}

export function buildIKEOBCRemoteConfig(args: BuildIKEOBCRemoteConfigArgs): IKBusMessage {
  if (args.slots.length > IKE_OBC_REMOTE_CONFIG_SLOTS) {
    throw new CommandPayloadError(
      `Too many slots (${args.slots.length}); max ${IKE_OBC_REMOTE_CONFIG_SLOTS}`,
    )
  }
  for (const b of args.slots) {
    if (b < 0 || b > 0xff) {
      throw new CommandPayloadError(`Slot byte 0x${b.toString(16)} out of byte range`)
    }
  }
  const padded: number[] = [...args.slots]
  while (padded.length < IKE_OBC_REMOTE_CONFIG_SLOTS) padded.push(IKE_OBC_FUNCTION.VOID)
  return makeMessage(args.source ?? DEVICE_ADDRESSES.IKE, args.destination ?? DEVICE_ADDRESSES.GT, [
    CMD_IKE_OBC_REMOTE_CONFIG,
    ...padded,
  ])
}
