import { DEVICE_ADDRESSES, type DeviceAddress, type IKBusMessage } from '@emdzej/ikbus-protocol'
import { assertCommand, assertMinPayloadLength, makeMessage } from '../internal.js'

export const CMD_REMOTE_KEY = 0x72

/**
 * Documented remote-fob actions.  The full enumeration (trunk-release, panic,
 * comfort-open, comfort-close) is not characterised in any surveyed source —
 * unknown values surface via `rawNibble`.
 */
export type RemoteKeyAction = 'LOCK' | 'UNLOCK' | 'UNKNOWN'

export const REMOTE_KEY_VALUES = {
  LOCK: 0x01,
  UNLOCK: 0x02,
} as const

export interface RemoteKeyEvent {
  action: RemoteKeyAction
  /** Upper nibble of DB1 — the raw action code on the wire. */
  rawNibble: number
}

/** Parse a `0x72` remote-key-entry broadcast.  Action lives in the upper nibble of DB1. */
export function parseRemoteKey(message: IKBusMessage): RemoteKeyEvent {
  assertCommand(message, CMD_REMOTE_KEY)
  assertMinPayloadLength(message, 2)
  const rawNibble = (message.payload[1]! >> 4) & 0x0f
  let action: RemoteKeyAction = 'UNKNOWN'
  if (rawNibble === REMOTE_KEY_VALUES.LOCK) action = 'LOCK'
  else if (rawNibble === REMOTE_KEY_VALUES.UNLOCK) action = 'UNLOCK'
  return { action, rawNibble }
}

export interface BuildRemoteKeyArgs {
  source?: DeviceAddress
  destination?: DeviceAddress
  action: RemoteKeyAction
}

/** Build a `0x72` remote-key-entry frame.  Unknown actions emit `0x00`. */
export function buildRemoteKey(args: BuildRemoteKeyArgs): IKBusMessage {
  const nibble = args.action === 'LOCK' ? 0x01 : args.action === 'UNLOCK' ? 0x02 : 0x00
  return makeMessage(args.source ?? DEVICE_ADDRESSES.GM, args.destination ?? DEVICE_ADDRESSES.GLO, [
    CMD_REMOTE_KEY,
    nibble << 4,
  ])
}
