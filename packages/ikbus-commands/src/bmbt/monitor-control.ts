import { DEVICE_ADDRESSES, type DeviceAddress, type IBusMessage } from '@emdzej/ibusx-protocol'
import { assertCommand, assertMinPayloadLength, makeMessage } from '../internal.js'

export const CMD_BMBT_MONITOR_CONTROL = 0x4f

export type VideoSource = 'NAV_GT' | 'TV' | 'VM_GT' | 'UNKNOWN'
export type VideoEncoding = 'NTSC' | 'PAL' | 'NONE'
export type VideoAspect = 'A4_3' | 'A16_9' | 'ZOOM'

const SOURCE_BY_BITS = new Map<number, VideoSource>([
  [0x00, 'NAV_GT'],
  [0x01, 'TV'],
  [0x02, 'VM_GT'],
])

/** Parsed `0x4F` monitor-control message (GT / VID → BMBT). */
export interface MonitorControl {
  power: boolean
  source: VideoSource
  /** True if the encoding/aspect byte was present. */
  hasEncoding: boolean
  encoding: VideoEncoding
  aspect: VideoAspect
  rawByte1: number
  rawByte2: number | undefined
}

/** Parse a `0x4F` monitor-control frame.  Byte 2 is optional. */
export function parseMonitorControl(message: IBusMessage): MonitorControl {
  assertCommand(message, CMD_BMBT_MONITOR_CONTROL)
  assertMinPayloadLength(message, 2)
  const b1 = message.payload[1]!
  const b2 = message.payload[2]
  let encoding: VideoEncoding = 'NONE'
  let aspect: VideoAspect = 'A4_3'
  if (b2 !== undefined) {
    if ((b2 & 0x01) !== 0) encoding = 'NTSC'
    else if ((b2 & 0x02) !== 0) encoding = 'PAL'
    if ((b2 & 0x30) === 0x30) aspect = 'ZOOM'
    else if ((b2 & 0x10) !== 0) aspect = 'A16_9'
  }
  return {
    power: (b1 & 0x10) !== 0,
    source: SOURCE_BY_BITS.get(b1 & 0x03) ?? 'UNKNOWN',
    hasEncoding: b2 !== undefined,
    encoding,
    aspect,
    rawByte1: b1,
    rawByte2: b2,
  }
}

export interface BuildMonitorControlArgs {
  source?: DeviceAddress
  destination?: DeviceAddress
  power: boolean
  videoSource: VideoSource
  encoding?: VideoEncoding
  aspect?: VideoAspect
}

/** Build a `0x4F` monitor-control frame.  Defaults source to GT, dest to BMBT. */
export function buildMonitorControl(args: BuildMonitorControlArgs): IBusMessage {
  const sourceBits =
    args.videoSource === 'TV'
      ? 0x01
      : args.videoSource === 'VM_GT'
        ? 0x02
        : args.videoSource === 'NAV_GT'
          ? 0x00
          : 0x00
  const b1 = (args.power ? 0x10 : 0x00) | sourceBits
  let payload: number[]
  if (args.encoding === undefined && args.aspect === undefined) {
    payload = [CMD_BMBT_MONITOR_CONTROL, b1]
  } else {
    let b2 = 0
    if (args.encoding === 'NTSC') b2 |= 0x01
    else if (args.encoding === 'PAL') b2 |= 0x02
    if (args.aspect === 'A16_9') b2 |= 0x10
    else if (args.aspect === 'ZOOM') b2 |= 0x30
    payload = [CMD_BMBT_MONITOR_CONTROL, b1, b2]
  }
  return makeMessage(
    args.source ?? DEVICE_ADDRESSES.GT,
    args.destination ?? DEVICE_ADDRESSES.BMBT,
    payload,
  )
}
