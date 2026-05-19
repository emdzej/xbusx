import { DEVICE_ADDRESSES, type DeviceAddress, type IBusMessage } from '@emdzej/ibusx-protocol'
import { CommandPayloadError } from '../errors.js'
import { assertCommand, assertPayloadLength, makeMessage } from '../internal.js'

export const CMD_SPEED_RPM = 0x18

export interface SpeedRpm {
  /** Vehicle speed in km/h (max 510). */
  kmh: number
  /** Engine RPM (max 25500). */
  rpm: number
}

/**
 * Parse a `0x18` speed/RPM broadcast.  Speed is the wire byte × 2 (km/h),
 * RPM is the wire byte × 100.
 */
export function parseSpeedRpm(message: IBusMessage): SpeedRpm {
  assertCommand(message, CMD_SPEED_RPM)
  assertPayloadLength(message, 3)
  return {
    kmh: message.payload[1]! * 2,
    rpm: message.payload[2]! * 100,
  }
}

export interface BuildSpeedRpmArgs {
  source?: DeviceAddress
  destination?: DeviceAddress
  /** Speed in km/h.  Clamped to 0..510 and rounded to the nearest 2. */
  kmh: number
  /** Engine RPM.  Clamped to 0..25500 and rounded to the nearest 100. */
  rpm: number
}

/** Build a `0x18` speed/RPM broadcast. */
export function buildSpeedRpm(args: BuildSpeedRpmArgs): IBusMessage {
  if (args.kmh < 0 || args.rpm < 0) {
    throw new CommandPayloadError('Speed and RPM must be non-negative')
  }
  const speedByte = Math.min(0xff, Math.round(args.kmh / 2))
  const rpmByte = Math.min(0xff, Math.round(args.rpm / 100))
  return makeMessage(
    args.source ?? DEVICE_ADDRESSES.IKE,
    args.destination ?? DEVICE_ADDRESSES.GLO,
    [CMD_SPEED_RPM, speedByte, rpmByte],
  )
}
