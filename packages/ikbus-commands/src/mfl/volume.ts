import { DEVICE_ADDRESSES, type DeviceAddress, type IKBusMessage } from '@emdzej/ikbus-protocol'
import { CommandPayloadError } from '../errors.js'
import { assertCommand, assertPayloadLength, makeMessage } from '../internal.js'

export const CMD_VOLUME = 0x32

export type VolumeDirection = 'UP' | 'DOWN'

export interface VolumeChange {
  direction: VolumeDirection
  /** Number of volume steps (1..15 — upper nibble of the byte). */
  steps: number
}

/** Parse a `0x32` volume-change frame. */
export function parseVolume(message: IKBusMessage): VolumeChange {
  assertCommand(message, CMD_VOLUME)
  assertPayloadLength(message, 2)
  const byte = message.payload[1]!
  return {
    direction: (byte & 0x01) === 0 ? 'DOWN' : 'UP',
    steps: (byte >> 4) & 0x0f,
  }
}

export interface BuildVolumeArgs {
  source?: DeviceAddress
  destination?: DeviceAddress
  direction: VolumeDirection
  /** Number of steps.  Clamped to 1..15.  Defaults to 1. */
  steps?: number
}

/** Build a `0x32` volume-change frame.  Defaults source to MFL, destination to RAD. */
export function buildVolume(args: BuildVolumeArgs): IKBusMessage {
  const steps = args.steps ?? 1
  if (steps < 1 || steps > 15) {
    throw new CommandPayloadError(`Volume steps ${steps} out of range (1..15)`)
  }
  const directionBit = args.direction === 'UP' ? 0x01 : 0x00
  const byte = (steps << 4) | directionBit
  return makeMessage(
    args.source ?? DEVICE_ADDRESSES.MFL,
    args.destination ?? DEVICE_ADDRESSES.RAD,
    [CMD_VOLUME, byte],
  )
}
