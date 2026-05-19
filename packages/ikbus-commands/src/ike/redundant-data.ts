import { DEVICE_ADDRESSES, type DeviceAddress, type IBusMessage } from '@emdzej/ibusx-protocol'
import { CommandPayloadError } from '../errors.js'
import { assertCommand, assertPayloadLength, makeMessage } from '../internal.js'

export const CMD_IKE_REDUNDANT_DATA_REQUEST = 0x53
export const CMD_IKE_REDUNDANT_DATA = 0x54

/**
 * `0x53` Redundant Data Request — IKE asks the LCM for its mirrored
 * VIN/mileage/SII data.  Sent at ignition (KL-15).  No arguments.
 *
 * Source: Wilhelm `ike/53.md`.  Direction IKE (`0x80`) → LCM (`0xD0`).
 * Wire: `80 03 D0 53 00`.
 */
export function buildIKERedundantDataRequest(args: {
  source?: DeviceAddress
  destination?: DeviceAddress
}): IBusMessage {
  return makeMessage(
    args.source ?? DEVICE_ADDRESSES.IKE,
    args.destination ?? DEVICE_ADDRESSES.LCM,
    [CMD_IKE_REDUNDANT_DATA_REQUEST],
  )
}

// ---------------------------------------------------------------------------

/**
 * `0x54` Redundant Data — LCM's reply with its mirrored cluster
 * service-data: VIN, mileage, time-/distance-to-service.  13-byte
 * data payload after the command byte.
 *
 * Source: Wilhelm `ike/54.md`.  Direction LCM (`0xD0`) → IKE (`0x80`).
 *
 * Wire example: `D0 10 80 54 41 42 12 34 50 09 86 40 46 00 00 04 03 EF`
 * decodes to VIN "AB12345", 243800 km, TBC byte 0x40, 700 L fuel, oil
 * `00 00`, time 1027 days.
 */
export interface IKERedundantData {
  /** 7-character VIN: 2 ASCII letters + 5 packed-BCD digits. */
  vin: string
  /** Mileage in km, in 100 km increments (decoded). */
  mileageKm: number
  /** TBC byte; per Wilhelm always `0x40` in observed frames.  Surfaced raw. */
  tbcRaw: number
  /** Consumed fuel in litres, in 10-L increments (decoded). */
  fuelLitres: number
  /** Last-oil-service raw 16-bit value.  Unit not publicly documented. */
  oilRaw: number
  /** Time inspection counter in days. */
  timeDays: number
}

function decodeVin(bytes: Uint8Array): string {
  // bytes 0,1 = ASCII letters; bytes 2,3 = 2 packed BCD digits each; byte 4 = 1 BCD digit + 4-bit pad
  const a = String.fromCharCode(bytes[0]!)
  const b = String.fromCharCode(bytes[1]!)
  const d12 = `${(bytes[2]! >> 4) & 0x0f}${bytes[2]! & 0x0f}`
  const d34 = `${(bytes[3]! >> 4) & 0x0f}${bytes[3]! & 0x0f}`
  const d5 = `${(bytes[4]! >> 4) & 0x0f}`
  return a + b + d12 + d34 + d5
}

function encodeVin(vin: string): Uint8Array {
  if (vin.length !== 7) {
    throw new CommandPayloadError(`VIN must be exactly 7 characters (got ${vin.length})`)
  }
  const cA = vin.charCodeAt(0)
  const cB = vin.charCodeAt(1)
  if (cA > 0xff || cB > 0xff) {
    throw new CommandPayloadError('VIN prefix must be Latin-1')
  }
  const digits = vin.slice(2)
  for (const ch of digits) {
    if (ch < '0' || ch > '9') {
      throw new CommandPayloadError(`VIN suffix must be 5 decimal digits (got ${digits})`)
    }
  }
  const d1 = Number.parseInt(digits[0]!, 10)
  const d2 = Number.parseInt(digits[1]!, 10)
  const d3 = Number.parseInt(digits[2]!, 10)
  const d4 = Number.parseInt(digits[3]!, 10)
  const d5 = Number.parseInt(digits[4]!, 10)
  return new Uint8Array([cA, cB, (d1 << 4) | d2, (d3 << 4) | d4, (d5 << 4) | 0])
}

export function parseIKERedundantData(message: IBusMessage): IKERedundantData {
  assertCommand(message, CMD_IKE_REDUNDANT_DATA)
  // 1 cmd + 5 VIN + 2 mileage + 1 TBC + 1 fuel + 2 oil + 2 time = 14 bytes
  assertPayloadLength(message, 14)
  const vinBytes = message.payload.slice(1, 6)
  const mileage = (message.payload[6]! << 8) | message.payload[7]!
  const tbcRaw = message.payload[8]!
  const fuelByte = message.payload[9]!
  const oilRaw = (message.payload[10]! << 8) | message.payload[11]!
  const timeDays = (message.payload[12]! << 8) | message.payload[13]!
  return {
    vin: decodeVin(vinBytes),
    mileageKm: mileage * 100,
    tbcRaw,
    fuelLitres: fuelByte * 10,
    oilRaw,
    timeDays,
  }
}

export interface BuildIKERedundantDataArgs {
  source?: DeviceAddress
  destination?: DeviceAddress
  vin: string
  mileageKm: number
  /** Defaults to `0x40` (the only value observed in Wilhelm). */
  tbcRaw?: number
  fuelLitres: number
  /** Raw 16-bit oil field. */
  oilRaw: number
  timeDays: number
}

export function buildIKERedundantData(args: BuildIKERedundantDataArgs): IBusMessage {
  const vinBytes = encodeVin(args.vin)
  const mileageWord = Math.round(args.mileageKm / 100)
  const fuelByte = Math.round(args.fuelLitres / 10)
  if (mileageWord < 0 || mileageWord > 0xffff) {
    throw new CommandPayloadError(`mileageKm ${args.mileageKm} → word ${mileageWord} out of range`)
  }
  if (fuelByte < 0 || fuelByte > 0xff) {
    throw new CommandPayloadError(`fuelLitres ${args.fuelLitres} → byte ${fuelByte} out of range`)
  }
  if (args.oilRaw < 0 || args.oilRaw > 0xffff) {
    throw new CommandPayloadError(`oilRaw out of 16-bit range`)
  }
  if (args.timeDays < 0 || args.timeDays > 0xffff) {
    throw new CommandPayloadError(`timeDays out of 16-bit range`)
  }
  const tbc = args.tbcRaw ?? 0x40
  if (tbc < 0 || tbc > 0xff) throw new CommandPayloadError(`tbcRaw out of byte range`)
  return makeMessage(
    args.source ?? DEVICE_ADDRESSES.LCM,
    args.destination ?? DEVICE_ADDRESSES.IKE,
    [
      CMD_IKE_REDUNDANT_DATA,
      ...vinBytes,
      (mileageWord >> 8) & 0xff,
      mileageWord & 0xff,
      tbc & 0xff,
      fuelByte & 0xff,
      (args.oilRaw >> 8) & 0xff,
      args.oilRaw & 0xff,
      (args.timeDays >> 8) & 0xff,
      args.timeDays & 0xff,
    ],
  )
}
