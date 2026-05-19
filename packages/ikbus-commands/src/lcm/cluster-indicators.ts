import { DEVICE_ADDRESSES, type DeviceAddress, type IBusMessage } from '@emdzej/ibusx-protocol'
import { assertCommand, assertMinPayloadLength, makeMessage } from '../internal.js'

export const CMD_LCM_INDICATORS_REQUEST = 0x5a
export const CMD_LCM_INDICATORS = 0x5b

/**
 * Cluster indicator bit layout.  Per Wilhelm `lcm/5b.md`, the LCM emits this
 * roughly every 100ms.  The exact byte layout shifts between LCM variants
 * (LME38 vs LCM vs LCM_II vs LSZ — see docs/devices/lcm.md), but byte 0 is
 * stable across all variants — that's the one we surface here as structured
 * fields.
 */
export interface ClusterIndicators {
  /** Byte 0 — main indicator bits, stable across variants. */
  parking: boolean
  lowBeam: boolean
  highBeam: boolean
  fogFront: boolean
  fogRear: boolean
  turnLeft: boolean
  turnRight: boolean
  /** Hazards or rapid blinking. */
  turnRapid: boolean
  /** Byte 1 (CCM bulb-fault flags) and beyond — exposed raw for variant-aware parsing. */
  rawBytes: Uint8Array
}

export const INDICATOR_BITS = {
  PARKING: 0x01,
  LOW_BEAM: 0x02,
  HIGH_BEAM: 0x04,
  FOG_FRONT: 0x08,
  FOG_REAR: 0x10,
  TURN_LEFT: 0x20,
  TURN_RIGHT: 0x40,
  TURN_RAPID: 0x80,
} as const

/** Parse a `0x5B` cluster-indicators broadcast. */
export function parseClusterIndicators(message: IBusMessage): ClusterIndicators {
  assertCommand(message, CMD_LCM_INDICATORS)
  assertMinPayloadLength(message, 2)
  const b0 = message.payload[1]!
  const rawBytes = message.payload.slice(1)
  return {
    parking: (b0 & INDICATOR_BITS.PARKING) !== 0,
    lowBeam: (b0 & INDICATOR_BITS.LOW_BEAM) !== 0,
    highBeam: (b0 & INDICATOR_BITS.HIGH_BEAM) !== 0,
    fogFront: (b0 & INDICATOR_BITS.FOG_FRONT) !== 0,
    fogRear: (b0 & INDICATOR_BITS.FOG_REAR) !== 0,
    turnLeft: (b0 & INDICATOR_BITS.TURN_LEFT) !== 0,
    turnRight: (b0 & INDICATOR_BITS.TURN_RIGHT) !== 0,
    turnRapid: (b0 & INDICATOR_BITS.TURN_RAPID) !== 0,
    rawBytes,
  }
}

export interface BuildClusterIndicatorsArgs {
  source?: DeviceAddress
  destination?: DeviceAddress
  parking?: boolean
  lowBeam?: boolean
  highBeam?: boolean
  fogFront?: boolean
  fogRear?: boolean
  turnLeft?: boolean
  turnRight?: boolean
  turnRapid?: boolean
  /** Optional additional bytes (CCM faults / KOMBI flags etc.).  Defaults to 3 zero bytes (typical LCM_III frame). */
  tail?: ReadonlyArray<number>
}

/** Build a `0x5B` cluster-indicators broadcast. */
export function buildClusterIndicators(args: BuildClusterIndicatorsArgs = {}): IBusMessage {
  const b0 =
    (args.parking ? INDICATOR_BITS.PARKING : 0) |
    (args.lowBeam ? INDICATOR_BITS.LOW_BEAM : 0) |
    (args.highBeam ? INDICATOR_BITS.HIGH_BEAM : 0) |
    (args.fogFront ? INDICATOR_BITS.FOG_FRONT : 0) |
    (args.fogRear ? INDICATOR_BITS.FOG_REAR : 0) |
    (args.turnLeft ? INDICATOR_BITS.TURN_LEFT : 0) |
    (args.turnRight ? INDICATOR_BITS.TURN_RIGHT : 0) |
    (args.turnRapid ? INDICATOR_BITS.TURN_RAPID : 0)
  const tail = args.tail ?? [0x00, 0x00, 0x00]
  return makeMessage(
    args.source ?? DEVICE_ADDRESSES.LCM,
    args.destination ?? DEVICE_ADDRESSES.GLO,
    [CMD_LCM_INDICATORS, b0, ...tail],
  )
}

export interface BuildClusterIndicatorsRequestArgs {
  source: DeviceAddress
  destination?: DeviceAddress
}

/** Build a `0x5A` request asking the LCM to re-broadcast its cluster indicators. */
export function buildClusterIndicatorsRequest(
  args: BuildClusterIndicatorsRequestArgs,
): IBusMessage {
  return makeMessage(args.source, args.destination ?? DEVICE_ADDRESSES.LCM, [
    CMD_LCM_INDICATORS_REQUEST,
  ])
}
