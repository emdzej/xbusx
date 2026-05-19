import { DEVICE_ADDRESSES, type DeviceAddress, type IBusMessage } from '@emdzej/ibusx-protocol'
import { assertCommand, assertMinPayloadLength, makeMessage } from '../internal.js'

export const CMD_DOORS_REQUEST = 0x79
export const CMD_DOORS_STATUS = 0x7a

/** Central-locking state encoded in bits 4-5 of byte 1. */
export type CentralLockState = 'UNLOCKED' | 'LOCKED' | 'DOUBLE_LOCKED' | 'UNKNOWN'

/**
 * Parsed `0x7A` door / lid / window state.  Reference frame:
 * `00 05 BF 7A <byte1> <byte2> <xor>`.
 *
 * The reference encoding is from Wilhelm `gm/7a.md` and matches the
 * ZKE3-GM1 E39 Touring (6/97) data sheet.  Later ZKE variants may rearrange
 * specific bits — surface as TBC in the docs.
 */
export interface DoorsState {
  driverDoorOpen: boolean
  passengerDoorOpen: boolean
  rearRightDoorOpen: boolean
  rearLeftDoorOpen: boolean
  centralLock: CentralLockState
  interiorLamp: boolean
  driverWindowOpen: boolean
  passengerWindowOpen: boolean
  rearRightWindowOpen: boolean
  rearLeftWindowOpen: boolean
  sunroofOpen: boolean
  rearLidOpen: boolean
  frontLidOpen: boolean
  bootReleaseTriggered: boolean
}

function decodeCentralLock(byte: number): CentralLockState {
  switch (byte & 0x30) {
    case 0x10:
      return 'UNLOCKED'
    case 0x20:
      return 'LOCKED'
    case 0x30:
      return 'DOUBLE_LOCKED'
    default:
      return 'UNKNOWN'
  }
}

function encodeCentralLock(state: CentralLockState): number {
  switch (state) {
    case 'UNLOCKED':
      return 0x10
    case 'LOCKED':
      return 0x20
    case 'DOUBLE_LOCKED':
      return 0x30
    case 'UNKNOWN':
      return 0x00
  }
}

/** Parse a `0x7A` door / lid status broadcast from the GM. */
export function parseDoorsStatus(message: IBusMessage): DoorsState {
  assertCommand(message, CMD_DOORS_STATUS)
  assertMinPayloadLength(message, 3)
  const b1 = message.payload[1]!
  const b2 = message.payload[2]!
  return {
    driverDoorOpen: (b1 & 0x01) !== 0,
    passengerDoorOpen: (b1 & 0x02) !== 0,
    rearRightDoorOpen: (b1 & 0x04) !== 0,
    rearLeftDoorOpen: (b1 & 0x08) !== 0,
    centralLock: decodeCentralLock(b1),
    interiorLamp: (b1 & 0x40) !== 0,
    driverWindowOpen: (b2 & 0x01) !== 0,
    passengerWindowOpen: (b2 & 0x02) !== 0,
    rearRightWindowOpen: (b2 & 0x04) !== 0,
    rearLeftWindowOpen: (b2 & 0x08) !== 0,
    sunroofOpen: (b2 & 0x10) !== 0,
    rearLidOpen: (b2 & 0x20) !== 0,
    frontLidOpen: (b2 & 0x40) !== 0,
    bootReleaseTriggered: (b2 & 0x80) !== 0,
  }
}

export interface BuildDoorsStatusArgs extends Partial<DoorsState> {
  source?: DeviceAddress
  destination?: DeviceAddress
}

/** Build a `0x7A` door / lid status broadcast. */
export function buildDoorsStatus(args: BuildDoorsStatusArgs = {}): IBusMessage {
  const b1 =
    (args.driverDoorOpen ? 0x01 : 0) |
    (args.passengerDoorOpen ? 0x02 : 0) |
    (args.rearRightDoorOpen ? 0x04 : 0) |
    (args.rearLeftDoorOpen ? 0x08 : 0) |
    encodeCentralLock(args.centralLock ?? 'UNKNOWN') |
    (args.interiorLamp ? 0x40 : 0)
  const b2 =
    (args.driverWindowOpen ? 0x01 : 0) |
    (args.passengerWindowOpen ? 0x02 : 0) |
    (args.rearRightWindowOpen ? 0x04 : 0) |
    (args.rearLeftWindowOpen ? 0x08 : 0) |
    (args.sunroofOpen ? 0x10 : 0) |
    (args.rearLidOpen ? 0x20 : 0) |
    (args.frontLidOpen ? 0x40 : 0) |
    (args.bootReleaseTriggered ? 0x80 : 0)
  return makeMessage(args.source ?? DEVICE_ADDRESSES.GM, args.destination ?? DEVICE_ADDRESSES.GLO, [
    CMD_DOORS_STATUS,
    b1,
    b2,
  ])
}

export interface BuildDoorsRequestArgs {
  source: DeviceAddress
  destination?: DeviceAddress
}

/** Build a `0x79` request asking the GM to re-broadcast its door / lid state. */
export function buildDoorsRequest(args: BuildDoorsRequestArgs): IBusMessage {
  return makeMessage(args.source, args.destination ?? DEVICE_ADDRESSES.GM, [CMD_DOORS_REQUEST])
}
