import { DEVICE_ADDRESSES, type DeviceAddress, type IKBusMessage } from '@emdzej/ikbus-protocol'
import { CommandPayloadError } from '../errors.js'
import { assertCommand, assertPayloadLength, makeMessage } from '../internal.js'

export const CMD_IKE_LANGUAGE_REGION_REQUEST = 0x14
export const CMD_IKE_LANGUAGE_REGION = 0x15

/**
 * `0x14` Language & Region request — sent by any module to the IKE
 * asking it to (re)broadcast the current cluster language/region
 * configuration.  Frame: `[0x14]` (no params).
 *
 * Source: Wilhelm `ike/14.md`.  Examples:
 *
 *   30 03 80 14 A7  # CCM
 *   3B 03 80 14 AC  # GT
 *   68 03 80 14 FF  # Radio
 *   C8 03 80 14 5F  # Telephone
 */
export function buildIKELanguageRegionRequest(args: {
  source: DeviceAddress
  destination?: DeviceAddress
}): IKBusMessage {
  return makeMessage(args.source, args.destination ?? DEVICE_ADDRESSES.IKE, [
    CMD_IKE_LANGUAGE_REGION_REQUEST,
  ])
}

// ---------------------------------------------------------------------------

/**
 * `0x15` Language & Region — the cluster broadcasts its
 * language/region/equipment configuration.  4-byte fixed payload.
 *
 * Source: Wilhelm `ike/15.md`.  Direction IKE (`0x80`) → broadcast
 * (`0xBF`) for self-announcement, or GT (`0x3B`) → IKE (`0x80`) for
 * updates.
 *
 * Wire layout (after the `0x15` command byte): 4 bytes of bitfields,
 * the 8-bit field identifiers carve up the bytes in Wilhelm's "byte 1/2/
 * 3/4" diagram.
 */
export interface IKELanguageRegion {
  language: number // Byte 1 low nibble
  clusterType: number // Byte 1 high nibble
  // Byte 2 flags
  time12h: boolean
  temperatureFahrenheit: boolean
  obcResumeAtKlR: boolean
  obcSpeedCorrection: boolean
  avgSpeedMph: boolean
  limitMph: boolean
  distanceMiles: boolean
  arrival12h: boolean
  // Byte 3 fields
  consump1: number // 0..3 (L_100 / MPG_UK / MPG_US / KM_L)
  consump2: number // 0..3 same mapping
  rangeMiles: boolean
  auxTimer1_12h: boolean
  auxTimer2_12h: boolean
  memoOnLCM: boolean
  // Byte 4 flags
  auxHeating: boolean
  auxVentilation: boolean
  motorDiesel: boolean
  rccTime: boolean
  auxControllerPostPU96: boolean
  // Raw bytes preserved for the bits Wilhelm marks "unallocated".
  rawByte1: number
  rawByte2: number
  rawByte3: number
  rawByte4: number
}

export const IKE_LANGUAGE = {
  DE: 0,
  EN_GB: 1,
  EN_US: 2,
  IT: 3,
  ES: 4,
  JP: 5,
  FR: 6,
  EN_CA: 7,
  GOLF: 8,
} as const

export const IKE_CLUSTER_TYPE = {
  HIGH: 0x00,
  LOW: 0x30, // Wilhelm: 0b0011_0000 (in the high nibble of byte 1)
  E46_A: 0x40,
  E46_B: 0x60,
  E46_C: 0xf0,
  E85: 0xa0,
} as const

export function parseIKELanguageRegion(message: IKBusMessage): IKELanguageRegion {
  assertCommand(message, CMD_IKE_LANGUAGE_REGION)
  assertPayloadLength(message, 5)
  const b1 = message.payload[1]!
  const b2 = message.payload[2]!
  const b3 = message.payload[3]!
  const b4 = message.payload[4]!
  return {
    language: b1 & 0x0f,
    clusterType: b1 & 0xf0,
    time12h: (b2 & 0x01) !== 0,
    temperatureFahrenheit: (b2 & 0x02) !== 0,
    obcResumeAtKlR: (b2 & 0x04) !== 0,
    obcSpeedCorrection: (b2 & 0x08) !== 0,
    avgSpeedMph: (b2 & 0x10) !== 0,
    limitMph: (b2 & 0x20) !== 0,
    distanceMiles: (b2 & 0x40) !== 0,
    arrival12h: (b2 & 0x80) !== 0,
    consump1: b3 & 0x03,
    consump2: (b3 >> 2) & 0x03,
    rangeMiles: (b3 & 0x10) !== 0,
    auxTimer1_12h: (b3 & 0x20) !== 0,
    auxTimer2_12h: (b3 & 0x40) !== 0,
    memoOnLCM: (b3 & 0x80) !== 0,
    auxHeating: (b4 & 0x01) !== 0,
    auxVentilation: (b4 & 0x02) !== 0,
    motorDiesel: (b4 & 0x08) !== 0,
    rccTime: (b4 & 0x10) !== 0,
    auxControllerPostPU96: (b4 & 0x40) !== 0,
    rawByte1: b1,
    rawByte2: b2,
    rawByte3: b3,
    rawByte4: b4,
  }
}

export interface BuildIKELanguageRegionArgs {
  source?: DeviceAddress
  destination?: DeviceAddress
  /** Pre-built raw bytes, if you want full control. */
  raw?: [number, number, number, number]
  /** Otherwise specify each field; defaults are all-off / `LANG_DE` / `CLUSTER_HIGH`. */
  language?: number
  clusterType?: number
  time12h?: boolean
  temperatureFahrenheit?: boolean
  obcResumeAtKlR?: boolean
  obcSpeedCorrection?: boolean
  avgSpeedMph?: boolean
  limitMph?: boolean
  distanceMiles?: boolean
  arrival12h?: boolean
  consump1?: number
  consump2?: number
  rangeMiles?: boolean
  auxTimer1_12h?: boolean
  auxTimer2_12h?: boolean
  memoOnLCM?: boolean
  auxHeating?: boolean
  auxVentilation?: boolean
  motorDiesel?: boolean
  rccTime?: boolean
  auxControllerPostPU96?: boolean
}

export function buildIKELanguageRegion(args: BuildIKELanguageRegionArgs): IKBusMessage {
  let b1 = 0
  let b2 = 0
  let b3 = 0
  let b4 = 0
  if (args.raw) {
    b1 = args.raw[0]
    b2 = args.raw[1]
    b3 = args.raw[2]
    b4 = args.raw[3]
  } else {
    const lang = args.language ?? IKE_LANGUAGE.DE
    if (lang < 0 || lang > 0x0f) {
      throw new CommandPayloadError(`language ${lang} out of 4-bit range`)
    }
    const cluster = args.clusterType ?? IKE_CLUSTER_TYPE.HIGH
    if ((cluster & 0x0f) !== 0 || cluster > 0xff) {
      throw new CommandPayloadError(`clusterType 0x${cluster.toString(16)} not high-nibble aligned`)
    }
    b1 = (cluster & 0xf0) | (lang & 0x0f)
    if (args.time12h) b2 |= 0x01
    if (args.temperatureFahrenheit) b2 |= 0x02
    if (args.obcResumeAtKlR) b2 |= 0x04
    if (args.obcSpeedCorrection) b2 |= 0x08
    if (args.avgSpeedMph) b2 |= 0x10
    if (args.limitMph) b2 |= 0x20
    if (args.distanceMiles) b2 |= 0x40
    if (args.arrival12h) b2 |= 0x80
    const c1 = args.consump1 ?? 0
    const c2 = args.consump2 ?? 0
    if (c1 < 0 || c1 > 3) throw new CommandPayloadError(`consump1 ${c1} out of range 0..3`)
    if (c2 < 0 || c2 > 3) throw new CommandPayloadError(`consump2 ${c2} out of range 0..3`)
    b3 = (c1 & 0x03) | ((c2 & 0x03) << 2)
    if (args.rangeMiles) b3 |= 0x10
    if (args.auxTimer1_12h) b3 |= 0x20
    if (args.auxTimer2_12h) b3 |= 0x40
    if (args.memoOnLCM) b3 |= 0x80
    if (args.auxHeating) b4 |= 0x01
    if (args.auxVentilation) b4 |= 0x02
    if (args.motorDiesel) b4 |= 0x08
    if (args.rccTime) b4 |= 0x10
    if (args.auxControllerPostPU96) b4 |= 0x40
  }
  return makeMessage(
    args.source ?? DEVICE_ADDRESSES.IKE,
    args.destination ?? DEVICE_ADDRESSES.GLO,
    [CMD_IKE_LANGUAGE_REGION, b1 & 0xff, b2 & 0xff, b3 & 0xff, b4 & 0xff],
  )
}
