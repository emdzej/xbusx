import { DEVICE_ADDRESSES, type DeviceAddress, type IBusMessage } from '@emdzej/ibusx-protocol'
import { assertCommand, assertPayloadLength, makeMessage } from '../internal.js'

export const CMD_VISUAL_INDICATORS = 0x76

/** Visual-indicator flash flags. */
export interface VisualIndicators {
  hazards: boolean
  turnSignals: boolean
  lowBeams: boolean
  highBeams: boolean
  /** Wilhelm `gm/76.md` marks bit 7 (0x80) as "unknown" — possibly acoustic siren. */
  unknown: boolean
}

export const VISUAL_INDICATOR_BITS = {
  HAZARDS: 0x01,
  TURN_SIGNALS: 0x02,
  LOW_BEAMS: 0x04,
  HIGH_BEAMS: 0x08,
  UNKNOWN: 0x80,
} as const

/** Parse a `0x76` visual-indicators frame. */
export function parseVisualIndicators(message: IBusMessage): VisualIndicators {
  assertCommand(message, CMD_VISUAL_INDICATORS)
  assertPayloadLength(message, 2)
  const byte = message.payload[1]!
  return {
    hazards: (byte & VISUAL_INDICATOR_BITS.HAZARDS) !== 0,
    turnSignals: (byte & VISUAL_INDICATOR_BITS.TURN_SIGNALS) !== 0,
    lowBeams: (byte & VISUAL_INDICATOR_BITS.LOW_BEAMS) !== 0,
    highBeams: (byte & VISUAL_INDICATOR_BITS.HIGH_BEAMS) !== 0,
    unknown: (byte & VISUAL_INDICATOR_BITS.UNKNOWN) !== 0,
  }
}

export interface BuildVisualIndicatorsArgs extends Partial<VisualIndicators> {
  source?: DeviceAddress
  destination?: DeviceAddress
}

/** Build a `0x76` visual-indicators frame. */
export function buildVisualIndicators(args: BuildVisualIndicatorsArgs = {}): IBusMessage {
  const byte =
    (args.hazards ? VISUAL_INDICATOR_BITS.HAZARDS : 0) |
    (args.turnSignals ? VISUAL_INDICATOR_BITS.TURN_SIGNALS : 0) |
    (args.lowBeams ? VISUAL_INDICATOR_BITS.LOW_BEAMS : 0) |
    (args.highBeams ? VISUAL_INDICATOR_BITS.HIGH_BEAMS : 0) |
    (args.unknown ? VISUAL_INDICATOR_BITS.UNKNOWN : 0)
  return makeMessage(args.source ?? DEVICE_ADDRESSES.GM, args.destination ?? DEVICE_ADDRESSES.GLO, [
    CMD_VISUAL_INDICATORS,
    byte,
  ])
}
