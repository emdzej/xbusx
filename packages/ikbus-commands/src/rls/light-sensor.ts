import { DEVICE_ADDRESSES, type DeviceAddress, type IKBusMessage } from '@emdzej/ikbus-protocol'
import { assertCommand, assertPayloadLength, makeMessage } from '../internal.js'

export const CMD_RLS_LIGHT_SENSOR = 0x59

/** Light sensor intensity steps (per Wilhelm `rls/59.md`). */
export const LIGHT_INTENSITY_STEPS = [0x10, 0x20, 0x30, 0x40, 0x50, 0x60] as const

/** Reason flags in byte 2 (`0b0001_1111` mask). */
export const LIGHT_REASON_BITS = {
  TWILIGHT: 0x01,
  DARKNESS: 0x02,
  RAIN: 0x04,
  TUNNEL: 0x08,
  GARAGE: 0x10,
} as const

export type LightReason = keyof typeof LIGHT_REASON_BITS

export interface LightSensorState {
  /** 1..6 ambient-light intensity (1 = brightest, 6 = darkest). */
  intensity: number
  /** True if headlights should be on. */
  lightsOn: boolean
  /** All triggering reason flags currently set. */
  reasons: ReadonlyArray<LightReason>
  rawByte1: number
  rawByte2: number
}

/** Parse a `0x59` light-sensor status frame (RLS → LCM). */
export function parseLightSensor(message: IKBusMessage): LightSensorState {
  assertCommand(message, CMD_RLS_LIGHT_SENSOR)
  assertPayloadLength(message, 3)
  const b1 = message.payload[1]!
  const b2 = message.payload[2]!
  const intensityBits = b1 & 0x70
  const intensity = intensityBits === 0 ? 0 : intensityBits >> 4
  const reasons: LightReason[] = []
  for (const [name, bits] of Object.entries(LIGHT_REASON_BITS)) {
    if ((b2 & bits) !== 0) reasons.push(name as LightReason)
  }
  return {
    intensity,
    lightsOn: (b1 & 0x01) !== 0,
    reasons,
    rawByte1: b1,
    rawByte2: b2,
  }
}

export interface BuildLightSensorArgs {
  source?: DeviceAddress
  destination?: DeviceAddress
  /** 1..6.  Defaults to 1 (brightest). */
  intensity?: number
  lightsOn?: boolean
  reasons?: ReadonlyArray<LightReason>
}

/** Build a `0x59` light-sensor frame.  Defaults source to RLS, dest to LCM. */
export function buildLightSensor(args: BuildLightSensorArgs = {}): IKBusMessage {
  const intensity = Math.max(0, Math.min(6, args.intensity ?? 1))
  const b1 = (intensity << 4) | (args.lightsOn ? 0x01 : 0)
  const b2 = (args.reasons ?? []).reduce((acc, r) => acc | LIGHT_REASON_BITS[r], 0)
  return makeMessage(
    args.source ?? DEVICE_ADDRESSES.RLS,
    args.destination ?? DEVICE_ADDRESSES.LCM,
    [CMD_RLS_LIGHT_SENSOR, b1, b2],
  )
}
