import { DEVICE_ADDRESSES, type DeviceAddress, type IKBusMessage } from '@emdzej/ikbus-protocol'
import { CommandPayloadError } from '../errors.js'
import { assertCommand, assertPayloadLength, makeMessage } from '../internal.js'

export const CMD_IGNITION_REQUEST = 0x10
export const CMD_IGNITION_STATUS = 0x11

/** Ignition / key position. */
export type IgnitionState = 'OFF' | 'KL_R' | 'KL_15' | 'KL_50'

/** Wire-byte values for each ignition state. */
export const IGNITION_STATE_VALUES = {
  OFF: 0x00,
  KL_R: 0x01,
  KL_15: 0x03,
  KL_50: 0x07,
} as const satisfies Record<IgnitionState, number>

const STATE_BY_BYTE: Readonly<Record<number, IgnitionState>> = {
  0: 'OFF',
  1: 'KL_R',
  3: 'KL_15',
  7: 'KL_50',
}

/** Parse a `0x11` ignition-status broadcast from the IKE. */
export function parseIgnitionStatus(message: IKBusMessage): IgnitionState {
  assertCommand(message, CMD_IGNITION_STATUS)
  assertPayloadLength(message, 2)
  const byte = message.payload[1]!
  const state = STATE_BY_BYTE[byte]
  if (state === undefined) {
    throw new CommandPayloadError(
      `Unknown ignition state byte 0x${byte.toString(16).padStart(2, '0').toUpperCase()}`,
    )
  }
  return state
}

export interface BuildIgnitionStatusArgs {
  /** Source address.  Defaults to IKE (0x80). */
  source?: DeviceAddress
  /** Destination address.  Defaults to GLO (0xBF) broadcast. */
  destination?: DeviceAddress
  state: IgnitionState
}

/** Build a `0x11` ignition-status broadcast. */
export function buildIgnitionStatus(args: BuildIgnitionStatusArgs): IKBusMessage {
  return makeMessage(
    args.source ?? DEVICE_ADDRESSES.IKE,
    args.destination ?? DEVICE_ADDRESSES.GLO,
    [CMD_IGNITION_STATUS, IGNITION_STATE_VALUES[args.state]],
  )
}

export interface BuildIgnitionRequestArgs {
  source: DeviceAddress
  /** Destination address.  Defaults to IKE (0x80). */
  destination?: DeviceAddress
}

/** Build a `0x10` request asking the IKE to re-broadcast its ignition status. */
export function buildIgnitionRequest(args: BuildIgnitionRequestArgs): IKBusMessage {
  return makeMessage(args.source, args.destination ?? DEVICE_ADDRESSES.IKE, [CMD_IGNITION_REQUEST])
}
