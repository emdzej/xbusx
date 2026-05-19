import { DEVICE_ADDRESSES, type DeviceAddress, type IKBusMessage } from '@emdzej/ikbus-protocol'
import { assertCommand, assertPayloadLength, makeMessage } from '../internal.js'

export const CMD_CCM_STATUS = 0x51

/**
 * Check Control Status broadcast from the CCM (Check Control Module).
 *
 * Source: Wilhelm `lcm/51.md`.  Direction CCM (`0x30`) → broadcast
 * (`0xBF`).  **Applies to low cluster (KOMBI) only.**  On later models
 * (E46+) these sensors connect directly to the IKE and `0x51` is unused.
 *
 * Single-byte payload after `0x51`; each bit corresponds to an
 * indicator/warning sign.
 */
export interface CCMStatus {
  brakeFluidLow: boolean
  fastenSeatbelt: boolean
  keyInIgnition: boolean
  washerFluidLow: boolean
  oilLevel: boolean
  rawByte: number
}

const BIT_BRAKE_FLUID_LOW = 0x01
const BIT_FASTEN_SEATBELT = 0x02
const BIT_KEY_IN_IGNITION = 0x04
const BIT_WASHER_FLUID_LOW = 0x10
const BIT_OIL_LEVEL = 0x40

export function parseCCMStatus(message: IKBusMessage): CCMStatus {
  assertCommand(message, CMD_CCM_STATUS)
  assertPayloadLength(message, 2)
  const b = message.payload[1]!
  return {
    brakeFluidLow: (b & BIT_BRAKE_FLUID_LOW) !== 0,
    fastenSeatbelt: (b & BIT_FASTEN_SEATBELT) !== 0,
    keyInIgnition: (b & BIT_KEY_IN_IGNITION) !== 0,
    washerFluidLow: (b & BIT_WASHER_FLUID_LOW) !== 0,
    oilLevel: (b & BIT_OIL_LEVEL) !== 0,
    rawByte: b,
  }
}

export interface BuildCCMStatusArgs {
  source?: DeviceAddress
  destination?: DeviceAddress
  brakeFluidLow?: boolean
  fastenSeatbelt?: boolean
  keyInIgnition?: boolean
  washerFluidLow?: boolean
  oilLevel?: boolean
}

export function buildCCMStatus(args: BuildCCMStatusArgs): IKBusMessage {
  let b = 0
  if (args.brakeFluidLow) b |= BIT_BRAKE_FLUID_LOW
  if (args.fastenSeatbelt) b |= BIT_FASTEN_SEATBELT
  if (args.keyInIgnition) b |= BIT_KEY_IN_IGNITION
  if (args.washerFluidLow) b |= BIT_WASHER_FLUID_LOW
  if (args.oilLevel) b |= BIT_OIL_LEVEL
  return makeMessage(
    args.source ?? DEVICE_ADDRESSES.CCM,
    args.destination ?? DEVICE_ADDRESSES.GLO,
    [CMD_CCM_STATUS, b & 0xff],
  )
}
