import { DEVICE_ADDRESSES, type DeviceAddress, type IKBusMessage } from '@emdzej/ikbus-protocol'
import { assertCommand, assertMinPayloadLength, makeMessage } from '../internal.js'

export const CMD_EWS_KEY_REQUEST = 0x73
export const CMD_EWS_KEY_STATUS = 0x74

/**
 * EWS key / immobiliser status.  The byte-level payload semantics are not
 * fully characterised in surveyed sources, so this codec exposes raw bytes.
 */
export interface KeyStatus {
  /** Raw status bytes after the command byte. */
  rawBytes: Uint8Array
}

/** Parse a `0x74` key-status frame from EWS. */
export function parseKeyStatus(message: IKBusMessage): KeyStatus {
  assertCommand(message, CMD_EWS_KEY_STATUS)
  assertMinPayloadLength(message, 1)
  return { rawBytes: message.payload.slice(1) }
}

export interface BuildKeyStatusArgs {
  source?: DeviceAddress
  destination?: DeviceAddress
  rawBytes?: ReadonlyArray<number> | Uint8Array
}

/** Build a `0x74` key-status frame. */
export function buildKeyStatus(args: BuildKeyStatusArgs = {}): IKBusMessage {
  const bytes = args.rawBytes ?? []
  return makeMessage(
    args.source ?? DEVICE_ADDRESSES.EWS,
    args.destination ?? DEVICE_ADDRESSES.GLO,
    [CMD_EWS_KEY_STATUS, ...Array.from(bytes)],
  )
}

export interface BuildKeyStatusRequestArgs {
  source: DeviceAddress
  destination?: DeviceAddress
}

/** Build a `0x73` key-status request frame. */
export function buildKeyStatusRequest(args: BuildKeyStatusRequestArgs): IKBusMessage {
  return makeMessage(args.source, args.destination ?? DEVICE_ADDRESSES.EWS, [CMD_EWS_KEY_REQUEST])
}
