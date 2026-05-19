import { DEVICE_ADDRESSES, type DeviceAddress, type IKBusMessage } from '@emdzej/ikbus-protocol'
import { CommandPayloadError } from '../errors.js'
import { assertCommand, assertMinPayloadLength, makeMessage } from '../internal.js'

export const CMD_SENSORS_REQUEST = 0x12
export const CMD_SENSORS_STATUS = 0x13

/**
 * Gear position.  `NONE` covers "not in any gear" (KL-30 / KL-R, or manual
 * transmission where the IKE doesn't track gears).  `NEUTRAL` is the actual
 * neutral position of an automatic.  Unknown gear nibbles parse to `undefined`.
 */
export type Gear = 'NONE' | 'R' | 'NEUTRAL' | 'D' | 'P' | '1' | '2' | '3' | '4' | '5' | '6'

/** Upper-nibble byte value for each gear (raw byte: nibble << 4). */
export const GEAR_NIBBLE_VALUES = {
  NONE: 0x0,
  R: 0x1,
  '1': 0x2,
  '2': 0x6,
  NEUTRAL: 0x7,
  D: 0x8,
  P: 0xb,
  '4': 0xc,
  '3': 0xd,
  '5': 0xe,
  '6': 0xf,
} as const satisfies Record<Gear, number>

const GEAR_BY_NIBBLE: Readonly<Record<number, Gear>> = {
  0: 'NONE',
  1: 'R',
  2: '1',
  6: '2',
  7: 'NEUTRAL',
  8: 'D',
  11: 'P',
  12: '4',
  13: '3',
  14: '5',
  15: '6',
}

/** ACC follow-distance setting (1 = nearest, 3 = furthest). */
export type AccDistance = 1 | 2 | 3

/** Parsed `0x13` sensor frame.  Fields beyond the basic three bytes are
 *  populated only when the payload is the longer IKI-cluster variant. */
export interface SensorsState {
  /** Byte 1: handbrake engaged. */
  handbrake: boolean
  /** Byte 1: oil-pressure-fault warning. */
  oilPressureFault: boolean
  /** Byte 1: brake-pad wear warning. */
  brakePadsWorn: boolean
  /** Byte 1: transmission in failsafe / emergency program. */
  transmissionFailsafe: boolean
  /** Byte 2 bit 0: engine running. */
  engineRunning: boolean
  /** Byte 2 bit 1: driver door open (mirror of GM 0x7A). */
  driverDoorOpen: boolean
  /** Byte 2 upper nibble: gear position.  `undefined` for unknown nibbles. */
  gear: Gear | undefined
  /** Byte 3: auxiliary heating active. */
  auxHeat: boolean
  /** Byte 3: auxiliary ventilation active. */
  auxVent: boolean
  /** True if the source frame was the 7-byte IKI variant. */
  isIki: boolean
  /** Byte 4 bit 1 (gasoline only).  IKI only. */
  engineFailsafe?: boolean
  /** Byte 4 bit 2 (diesel only).  IKI only. */
  injectionSystemFault?: boolean
  /** Byte 4 bit 3 (diesel only).  IKI only. */
  preheating?: boolean
  /** Byte 4 bit 5: coolant overheat.  IKI only. */
  coolantOverheat?: boolean
  /** Byte 5 bit 0: ACC inactive / faulted.  IKI only. */
  accInactive?: boolean
  /** Byte 5 bit 1: ACC sensor view obstructed.  IKI only. */
  accSensorView?: boolean
  /** Byte 5 bit 2: "please shift" — never used in production.  IKI only. */
  accPleaseShift?: boolean
  /** Byte 5 bits 3-4: ACC follow distance.  IKI only. */
  accDistance?: AccDistance
  /** Byte 6 bit 3: DSC off / faulted.  IKI only. */
  dscInactive?: boolean
  /** Byte 7: fuel level (raw 0..255).  IKI only. */
  fuelLevel?: number
}

/**
 * Parse a `0x13` sensor broadcast.  Accepts both the IKE 3-byte payload and
 * the IKI 7-byte extended payload.  The `isIki` flag on the returned state
 * indicates which variant produced it.
 */
export function parseSensors(message: IKBusMessage): SensorsState {
  assertCommand(message, CMD_SENSORS_STATUS)
  assertMinPayloadLength(message, 4) // cmd + 3 bytes
  const len = message.payload.length
  if (len !== 4 && len !== 8) {
    throw new CommandPayloadError(`Expected payload length 4 (IKE) or 8 (IKI), got ${len}`)
  }
  const b1 = message.payload[1]!
  const b2 = message.payload[2]!
  const b3 = message.payload[3]!

  const state: SensorsState = {
    handbrake: (b1 & 0x01) !== 0,
    oilPressureFault: (b1 & 0x02) !== 0,
    brakePadsWorn: (b1 & 0x04) !== 0,
    transmissionFailsafe: (b1 & 0x10) !== 0,
    engineRunning: (b2 & 0x01) !== 0,
    driverDoorOpen: (b2 & 0x02) !== 0,
    gear: GEAR_BY_NIBBLE[(b2 >> 4) & 0x0f],
    auxHeat: (b3 & 0x04) !== 0,
    auxVent: (b3 & 0x08) !== 0,
    isIki: len === 8,
  }

  if (len === 8) {
    const b4 = message.payload[4]!
    const b5 = message.payload[5]!
    const b6 = message.payload[6]!
    const b7 = message.payload[7]!
    state.engineFailsafe = (b4 & 0x02) !== 0
    state.injectionSystemFault = (b4 & 0x04) !== 0
    state.preheating = (b4 & 0x08) !== 0
    state.coolantOverheat = (b4 & 0x20) !== 0
    state.accInactive = (b5 & 0x01) !== 0
    state.accSensorView = (b5 & 0x02) !== 0
    state.accPleaseShift = (b5 & 0x04) !== 0
    const accDist = (b5 >> 3) & 0x03
    if (accDist === 1 || accDist === 2 || accDist === 3) state.accDistance = accDist
    state.dscInactive = (b6 & 0x08) !== 0
    state.fuelLevel = b7
  }

  return state
}

export interface BuildSensorsArgs {
  source?: DeviceAddress
  destination?: DeviceAddress
  handbrake?: boolean
  oilPressureFault?: boolean
  brakePadsWorn?: boolean
  transmissionFailsafe?: boolean
  engineRunning?: boolean
  driverDoorOpen?: boolean
  gear?: Gear
  auxHeat?: boolean
  auxVent?: boolean
}

/** Build a `0x13` sensor broadcast (IKE 3-byte payload). */
export function buildSensors(args: BuildSensorsArgs = {}): IKBusMessage {
  const b1 =
    (args.handbrake ? 0x01 : 0) |
    (args.oilPressureFault ? 0x02 : 0) |
    (args.brakePadsWorn ? 0x04 : 0) |
    (args.transmissionFailsafe ? 0x10 : 0)
  const gearNibble = args.gear !== undefined ? GEAR_NIBBLE_VALUES[args.gear] : 0
  const b2 = (args.engineRunning ? 0x01 : 0) | (args.driverDoorOpen ? 0x02 : 0) | (gearNibble << 4)
  const b3 = (args.auxHeat ? 0x04 : 0) | (args.auxVent ? 0x08 : 0)
  return makeMessage(
    args.source ?? DEVICE_ADDRESSES.IKE,
    args.destination ?? DEVICE_ADDRESSES.GLO,
    [CMD_SENSORS_STATUS, b1, b2, b3],
  )
}

export interface BuildSensorsRequestArgs {
  source: DeviceAddress
  destination?: DeviceAddress
}

/** Build a `0x12` request asking the IKE to re-broadcast its sensor frame. */
export function buildSensorsRequest(args: BuildSensorsRequestArgs): IKBusMessage {
  return makeMessage(args.source, args.destination ?? DEVICE_ADDRESSES.IKE, [CMD_SENSORS_REQUEST])
}
