import { DEVICE_ADDRESSES, type DeviceAddress, type IBusMessage } from '@emdzej/ibusx-protocol'
import { CommandPayloadError } from '../errors.js'
import { assertCommand, assertMinPayloadLength, makeMessage } from '../internal.js'

export const CMD_CDC_REQUEST = 0x38

/** CDC sub-command identifiers (the byte after `0x38`). */
export type CDCSubcommand =
  | 'GET_STATUS'
  | 'STOP_PLAYING'
  | 'PAUSE_PLAYING'
  | 'START_PLAYING'
  | 'SEEK'
  | 'CHANGE_TRACK_BLAUPUNKT'
  | 'CD_CHANGE'
  | 'SCAN'
  | 'RANDOM_MODE'
  | 'CHANGE_TRACK'
  | 'UNKNOWN'

export const CDC_SUBCOMMAND_VALUES = {
  GET_STATUS: 0x00,
  STOP_PLAYING: 0x01,
  PAUSE_PLAYING: 0x02,
  START_PLAYING: 0x03,
  SEEK: 0x04,
  CHANGE_TRACK_BLAUPUNKT: 0x05,
  CD_CHANGE: 0x06,
  SCAN: 0x07,
  RANDOM_MODE: 0x08,
  CHANGE_TRACK: 0x0a,
} as const

const SUBCMD_BY_BYTE = new Map<number, CDCSubcommand>(
  Object.entries(CDC_SUBCOMMAND_VALUES).map(([name, value]) => [value, name as CDCSubcommand]),
)

export interface CDCRequest {
  subcommand: CDCSubcommand
  /** Raw sub-command byte (useful for unknown values). */
  subcommandByte: number
  /** Parameter byte after the sub-command. */
  param: number
}

/** Parse a `0x38` CDC request frame (radio → CDC). */
export function parseCDCRequest(message: IBusMessage): CDCRequest {
  assertCommand(message, CMD_CDC_REQUEST)
  assertMinPayloadLength(message, 3)
  const subByte = message.payload[1]!
  const param = message.payload[2]!
  return {
    subcommand: SUBCMD_BY_BYTE.get(subByte) ?? 'UNKNOWN',
    subcommandByte: subByte,
    param,
  }
}

export interface BuildCDCRequestArgs {
  source?: DeviceAddress
  destination?: DeviceAddress
  /** Either a named sub-command or a raw byte for advanced cases. */
  subcommand: CDCSubcommand | number
  /** Parameter byte; defaults to 0. */
  param?: number
}

/** Build a `0x38` CDC request frame. */
export function buildCDCRequest(args: BuildCDCRequestArgs): IBusMessage {
  let subByte: number
  if (typeof args.subcommand === 'number') {
    subByte = args.subcommand & 0xff
  } else if (args.subcommand === 'UNKNOWN') {
    throw new CommandPayloadError('Cannot build a request with subcommand UNKNOWN')
  } else {
    subByte = CDC_SUBCOMMAND_VALUES[args.subcommand]
  }
  return makeMessage(
    args.source ?? DEVICE_ADDRESSES.RAD,
    args.destination ?? DEVICE_ADDRESSES.CDC,
    [CMD_CDC_REQUEST, subByte, args.param ?? 0],
  )
}
