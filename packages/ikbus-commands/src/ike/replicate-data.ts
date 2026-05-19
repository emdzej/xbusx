import { DEVICE_ADDRESSES, type DeviceAddress, type IKBusMessage } from '@emdzej/ikbus-protocol'
import { CommandPayloadError } from '../errors.js'
import { assertCommand, assertPayloadLength, makeMessage } from '../internal.js'

export const CMD_IKE_REPLICATE_DATA = 0x55

/**
 * Per-property layout in the 8-byte data block (Wilhelm `ike/55.md`).  The
 * cluster broadcasts these values to the LCM whenever any of them ticks
 * over an interval (mileage step, fuel step, day rollover).
 *
 * Byte indices into `payload[1..8]`:
 *
 *   0..1  Mileage     uint16 big-endian, × 100 = km
 *   2     TBC         uint8 — undocumented unit, surfaced raw
 *   3     Fuel        uint8, × 10 = litres
 *   4..5  Oil         uint16 big-endian — undocumented unit, surfaced raw
 *   6..7  Time        uint16 big-endian = days
 */
export interface IKEReplicateData {
  mileageKm: number
  tbcRaw: number
  fuelLitres: number
  oilRaw: number
  timeDays: number
}

export function parseIKEReplicateData(message: IKBusMessage): IKEReplicateData {
  assertCommand(message, CMD_IKE_REPLICATE_DATA)
  assertPayloadLength(message, 9)
  const mileage = (message.payload[1]! << 8) | message.payload[2]!
  const tbc = message.payload[3]!
  const fuel = message.payload[4]!
  const oil = (message.payload[5]! << 8) | message.payload[6]!
  const time = (message.payload[7]! << 8) | message.payload[8]!
  return {
    mileageKm: mileage * 100,
    tbcRaw: tbc,
    fuelLitres: fuel * 10,
    oilRaw: oil,
    timeDays: time,
  }
}

export interface BuildIKEReplicateDataArgs {
  source?: DeviceAddress
  destination?: DeviceAddress
  mileageKm: number
  /** Raw byte for the TBC field.  Unit/scale not publicly documented. */
  tbcRaw: number
  fuelLitres: number
  /** Raw uint16 for the Oil field.  Unit/scale not publicly documented. */
  oilRaw: number
  timeDays: number
}

/**
 * Build a `0x55` Replicate-Data broadcast from IKE → LCM.  All numeric
 * inputs round to the nearest representable step (× 100 km for mileage,
 * × 10 L for fuel, uint16 for the rest).
 */
export function buildIKEReplicateData(args: BuildIKEReplicateDataArgs): IKBusMessage {
  const mileageWord = Math.round(args.mileageKm / 100)
  const fuelByte = Math.round(args.fuelLitres / 10)
  if (mileageWord < 0 || mileageWord > 0xffff) {
    throw new CommandPayloadError(`Mileage word ${mileageWord} out of range 0..65535`)
  }
  if (fuelByte < 0 || fuelByte > 0xff) {
    throw new CommandPayloadError(`Fuel byte ${fuelByte} out of range 0..255`)
  }
  if (args.tbcRaw < 0 || args.tbcRaw > 0xff) {
    throw new CommandPayloadError(`TBC byte ${args.tbcRaw} out of range 0..255`)
  }
  if (args.oilRaw < 0 || args.oilRaw > 0xffff) {
    throw new CommandPayloadError(`Oil word ${args.oilRaw} out of range 0..65535`)
  }
  if (args.timeDays < 0 || args.timeDays > 0xffff) {
    throw new CommandPayloadError(`Time-days word ${args.timeDays} out of range 0..65535`)
  }
  return makeMessage(
    args.source ?? DEVICE_ADDRESSES.IKE,
    args.destination ?? DEVICE_ADDRESSES.LCM,
    [
      CMD_IKE_REPLICATE_DATA,
      (mileageWord >> 8) & 0xff,
      mileageWord & 0xff,
      args.tbcRaw & 0xff,
      fuelByte & 0xff,
      (args.oilRaw >> 8) & 0xff,
      args.oilRaw & 0xff,
      (args.timeDays >> 8) & 0xff,
      args.timeDays & 0xff,
    ],
  )
}
