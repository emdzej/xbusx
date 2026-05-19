import { DEVICE_ADDRESSES, type DeviceAddress, type IKBusMessage } from '@emdzej/ikbus-protocol'
import { CommandPayloadError } from '../errors.js'
import { assertCommand, assertPayloadLength, makeMessage } from '../internal.js'

export const CMD_BMBT_NAV_DIAL = 0x49

export type NavDialDirection = 'LEFT' | 'RIGHT'

export interface NavDialEvent {
  direction: NavDialDirection
  /** Number of clicks since the previous report (1..15). */
  steps: number
}

/** Parse a `0x49` BMBT nav-dial rotation event. */
export function parseNavDial(message: IKBusMessage): NavDialEvent {
  assertCommand(message, CMD_BMBT_NAV_DIAL)
  assertPayloadLength(message, 2)
  const byte = message.payload[1]!
  return {
    direction: (byte & 0x80) === 0 ? 'LEFT' : 'RIGHT',
    steps: byte & 0x0f,
  }
}

export interface BuildNavDialArgs {
  source?: DeviceAddress
  destination?: DeviceAddress
  direction: NavDialDirection
  /** 1..15.  Defaults to 1. */
  steps?: number
}

/** Build a `0x49` BMBT nav-dial frame.  Defaults source to BMBT, dest to GT. */
export function buildNavDial(args: BuildNavDialArgs): IKBusMessage {
  const steps = args.steps ?? 1
  if (steps < 1 || steps > 15) {
    throw new CommandPayloadError(`Nav-dial steps ${steps} out of range (1..15)`)
  }
  const byte = (args.direction === 'RIGHT' ? 0x80 : 0x00) | (steps & 0x0f)
  return makeMessage(
    args.source ?? DEVICE_ADDRESSES.BMBT,
    args.destination ?? DEVICE_ADDRESSES.GT,
    [CMD_BMBT_NAV_DIAL, byte],
  )
}
