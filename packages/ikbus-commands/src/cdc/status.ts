import { DEVICE_ADDRESSES, type DeviceAddress, type IKBusMessage } from '@emdzej/ikbus-protocol'
import { CommandPayloadError } from '../errors.js'
import { assertCommand, assertMinPayloadLength, makeMessage } from '../internal.js'

export const CMD_CDC_STATUS = 0x39

/** Top-level transport status (the byte right after `0x39`). */
export type CDCStatus =
  | 'STOP'
  | 'PAUSE'
  | 'PLAYING'
  | 'FAST_FWD'
  | 'FAST_REV'
  | 'NEXT_TRACK'
  | 'PREVIOUS_TRACK'
  | 'END'
  | 'LOADING'
  | 'MAGAZINE_CHECKING'
  | 'MAGAZINE_EJECTED'
  | 'UNKNOWN'

export const CDC_STATUS_VALUES = {
  STOP: 0x00,
  PAUSE: 0x01,
  PLAYING: 0x02,
  FAST_FWD: 0x03,
  FAST_REV: 0x04,
  NEXT_TRACK: 0x05,
  PREVIOUS_TRACK: 0x06,
  END: 0x07,
  LOADING: 0x08,
  MAGAZINE_CHECKING: 0x09,
  MAGAZINE_EJECTED: 0x0a,
} as const

const STATUS_BY_BYTE = new Map<number, CDCStatus>(
  Object.entries(CDC_STATUS_VALUES).map(([name, value]) => [value, name as CDCStatus]),
)

/** Function / audio-routing byte. */
export type CDCFunction =
  | 'NOT_PLAYING'
  | 'PLAYING'
  | 'PAUSE'
  | 'SCAN_MODE'
  | 'RANDOM_MODE'
  | 'UNKNOWN'

export const CDC_FUNCTION_VALUES = {
  NOT_PLAYING: 0x02,
  PLAYING: 0x09,
  PAUSE: 0x0c,
  SCAN_MODE: 0x19,
  RANDOM_MODE: 0x29,
} as const

const FUNCTION_BY_BYTE = new Map<number, CDCFunction>(
  Object.entries(CDC_FUNCTION_VALUES).map(([name, value]) => [value, name as CDCFunction]),
)

export interface CDCErrorFlags {
  highTemp: boolean
  noDisc: boolean
  noMagazine: boolean
}

/** Parsed `0x39` CDC status response. */
export interface CDCStatusFrame {
  status: CDCStatus
  /** Raw status byte. */
  statusByte: number
  function: CDCFunction
  /** Raw function byte (with the high bit stripped — 2001+ frames may OR-in `0x80`). */
  functionByte: number
  errorFlags: CDCErrorFlags
  /** Bitmask of magazine slots loaded (e.g. `0x3F` = all 6 slots, `0x01` = slot 1 only). */
  magazineMask: number
  disc: number
  track: number
}

const ERROR_HIGH_TEMP = 0x02
const ERROR_NO_DISC = 0x08
const ERROR_NO_MAGAZINE = 0x10

/** Parse a `0x39` CDC status response (CDC → radio). */
export function parseCDCStatus(message: IKBusMessage): CDCStatusFrame {
  assertCommand(message, CMD_CDC_STATUS)
  // 1997-era frames have 7 payload bytes (incl. cmd); 2001+ frames have more.
  // Either way we want at least 7.
  assertMinPayloadLength(message, 7)
  const statusByte = message.payload[1]!
  const functionByte = message.payload[2]!
  const errorByte = message.payload[3]!
  const magazine = message.payload[4]!
  // payload[5] is unknown / always 0 in observed traffic
  const disc = message.payload[6]!
  const track = message.payload[7] ?? 0
  return {
    status: STATUS_BY_BYTE.get(statusByte) ?? 'UNKNOWN',
    statusByte,
    function: FUNCTION_BY_BYTE.get(functionByte & 0x7f) ?? 'UNKNOWN',
    functionByte: functionByte & 0x7f,
    errorFlags: {
      highTemp: (errorByte & ERROR_HIGH_TEMP) !== 0,
      noDisc: (errorByte & ERROR_NO_DISC) !== 0,
      noMagazine: (errorByte & ERROR_NO_MAGAZINE) !== 0,
    },
    magazineMask: magazine,
    disc,
    track,
  }
}

export interface BuildCDCStatusArgs {
  source?: DeviceAddress
  destination?: DeviceAddress
  status: CDCStatus | number
  function: CDCFunction | number
  errorFlags?: Partial<CDCErrorFlags>
  /** Default: `0x01` (slot 1 only). */
  magazineMask?: number
  /** 1-indexed disc number.  Default: 1. */
  disc?: number
  /** 1-indexed track number.  Default: 1. */
  track?: number
}

/** Build a `0x39` CDC status response. */
export function buildCDCStatus(args: BuildCDCStatusArgs): IKBusMessage {
  let statusByte: number
  if (typeof args.status === 'number') {
    statusByte = args.status & 0xff
  } else if (args.status === 'UNKNOWN') {
    throw new CommandPayloadError('Cannot build a CDC status with status UNKNOWN')
  } else {
    statusByte = CDC_STATUS_VALUES[args.status]
  }
  let functionByte: number
  if (typeof args.function === 'number') {
    functionByte = args.function & 0xff
  } else if (args.function === 'UNKNOWN') {
    throw new CommandPayloadError('Cannot build a CDC status with function UNKNOWN')
  } else {
    functionByte = CDC_FUNCTION_VALUES[args.function]
  }
  const errorByte =
    (args.errorFlags?.highTemp ? ERROR_HIGH_TEMP : 0) |
    (args.errorFlags?.noDisc ? ERROR_NO_DISC : 0) |
    (args.errorFlags?.noMagazine ? ERROR_NO_MAGAZINE : 0)
  const magazineMask = args.magazineMask ?? 0x01
  const disc = args.disc ?? 1
  const track = args.track ?? 1
  return makeMessage(
    args.source ?? DEVICE_ADDRESSES.CDC,
    args.destination ?? DEVICE_ADDRESSES.RAD,
    [
      CMD_CDC_STATUS,
      statusByte,
      functionByte,
      errorByte,
      magazineMask & 0xff,
      0x00,
      disc & 0xff,
      track & 0xff,
    ],
  )
}
