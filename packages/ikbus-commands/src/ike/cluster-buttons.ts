import { DEVICE_ADDRESSES, type DeviceAddress, type IBusMessage } from '@emdzej/ibusx-protocol'
import { CommandPayloadError } from '../errors.js'
import { assertCommand, assertPayloadLength, makeMessage } from '../internal.js'

export const CMD_IKE_CLUSTER_BUTTON = 0x57

/**
 * Cluster button broadcast — `CHECK` button on high clusters and `BC`
 * button on the wiper stalk.  No 'hold' state, only press / release.
 *
 * Source: Wilhelm `ike/57.md`.  Direction IKE (`0x80`) → broadcast
 * (`0xFF`).  Wire example: `80 04 FF 57 01` (CHECK press),
 * `80 04 FF 57 41` (CHECK release).
 *
 * Single-byte payload after `0x57`:
 *
 *   bit 6 (0x40)  STATE — 0 = press, 1 = release
 *   bits 1..0     BUTTON — 0b01 CHECK, 0b10 STALK (BC)
 */
export const IKE_CLUSTER_BUTTON_VALUE = {
  CHECK: 0x01,
  STALK_BC: 0x02,
} as const

export type IKEClusterButtonName = keyof typeof IKE_CLUSTER_BUTTON_VALUE

export type IKEClusterButtonState = 'press' | 'release'

export interface IKEClusterButton {
  button: IKEClusterButtonName | 'unknown'
  rawButtonValue: number
  state: IKEClusterButtonState
  rawByte: number
}

export function parseIKEClusterButton(message: IBusMessage): IKEClusterButton {
  assertCommand(message, CMD_IKE_CLUSTER_BUTTON)
  assertPayloadLength(message, 2)
  const byte = message.payload[1]!
  const state: IKEClusterButtonState = (byte & 0x40) !== 0 ? 'release' : 'press'
  const raw = byte & 0x03
  let button: IKEClusterButtonName | 'unknown' = 'unknown'
  for (const [name, val] of Object.entries(IKE_CLUSTER_BUTTON_VALUE)) {
    if (val === raw) {
      button = name as IKEClusterButtonName
      break
    }
  }
  return { button, rawButtonValue: raw, state, rawByte: byte }
}

export interface BuildIKEClusterButtonArgs {
  source?: DeviceAddress
  destination?: DeviceAddress
  button: IKEClusterButtonName
  state?: IKEClusterButtonState
}

export function buildIKEClusterButton(args: BuildIKEClusterButtonArgs): IBusMessage {
  const value = IKE_CLUSTER_BUTTON_VALUE[args.button]
  if (value === undefined) {
    throw new CommandPayloadError(`Unknown cluster button: ${args.button}`)
  }
  let byte = value & 0x03
  if (args.state === 'release') byte |= 0x40
  return makeMessage(
    args.source ?? DEVICE_ADDRESSES.IKE,
    args.destination ?? DEVICE_ADDRESSES.LOC,
    [CMD_IKE_CLUSTER_BUTTON, byte],
  )
}
