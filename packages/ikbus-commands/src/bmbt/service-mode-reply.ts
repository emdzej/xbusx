import { DEVICE_ADDRESSES, type DeviceAddress, type IKBusMessage } from '@emdzej/ikbus-protocol'
import { CommandPayloadError } from '../errors.js'
import {
  assertCommand,
  assertMinPayloadLength,
  assertPayloadLength,
  makeMessage,
} from '../internal.js'

export const CMD_BMBT_SERVICE_REPLY = 0x06

/**
 * `0x06` is the BMBT's reply to a `0x05` service-mode request.  Wilhelm
 * notes that the reply is **stateful**: the meaning of the data bytes is
 * inferred from the preceding request.  We surface raw bytes here, and
 * provide dedicated sub-parsers below for the three documented reply
 * forms (ident / key-function / brightness).
 *
 * Source: Wilhelm `bmbt/06.md`.  Default direction BMBT (`0xF0`) → GT (`0x3B`).
 */
export interface BMBTServiceReply {
  /** Bytes after the command (`payload[1..]`). */
  data: Uint8Array
}

export function parseBMBTServiceReply(message: IKBusMessage): BMBTServiceReply {
  assertCommand(message, CMD_BMBT_SERVICE_REPLY)
  assertMinPayloadLength(message, 2)
  return { data: message.payload.slice(1) }
}

export interface BuildBMBTServiceReplyArgs {
  source?: DeviceAddress
  destination?: DeviceAddress
  data: ReadonlyArray<number> | Uint8Array
}

export function buildBMBTServiceReply(args: BuildBMBTServiceReplyArgs): IKBusMessage {
  const dataBytes = Array.from(args.data)
  if (dataBytes.length === 0) {
    throw new CommandPayloadError('Service-mode reply requires at least one data byte')
  }
  for (const b of dataBytes) {
    if (b < 0 || b > 0xff) {
      throw new CommandPayloadError(`Data byte 0x${b.toString(16)} out of byte range`)
    }
  }
  return makeMessage(
    args.source ?? DEVICE_ADDRESSES.BMBT,
    args.destination ?? DEVICE_ADDRESSES.GT,
    [CMD_BMBT_SERVICE_REPLY, ...dataBytes],
  )
}

// ---------------------------------------------------------------------------
// Stateful sub-parsers — pick one based on the preceding `0x05` request.

/**
 * Ident (version) reply.  Sent in response to `0x05 0x00`.  Frame: 17
 * payload bytes: `[0x06, partNo×4, hwLevel, codingIndex, diagIndex,
 * busIndex, manuMonthBCD, manuYearBCD, supplier, swLevel, ...4-byte TBC]`.
 * All numeric fields are BCD-packed.
 */
export interface BMBTIdentReply {
  /** Four-byte BMW part number, returned as the original BCD bytes. */
  partNumberBytes: Uint8Array
  hwLevel: number
  codingIndex: number
  diagIndex: number
  busIndex: number
  /** Date of manufacture: month is BCD in the first byte, year in the second. */
  manufactureMonthBcd: number
  manufactureYearBcd: number
  supplier: number
  swLevel: number
  /** Last 4 bytes Wilhelm marks "TBC".  Surfaced raw. */
  tail: Uint8Array
}

function bcd(byte: number): number {
  const high = (byte >> 4) & 0x0f
  const low = byte & 0x0f
  if (high > 9 || low > 9) {
    throw new CommandPayloadError(`Invalid BCD byte 0x${byte.toString(16).padStart(2, '0')}`)
  }
  return high * 10 + low
}

/**
 * Decode a `0x06` reply as a BMBT ident frame.  Caller must know the
 * preceding request was `0x05 0x00`.  Throws if the payload doesn't have
 * the expected 17 bytes.
 */
export function parseBMBTIdentReply(message: IKBusMessage): BMBTIdentReply {
  assertCommand(message, CMD_BMBT_SERVICE_REPLY)
  assertPayloadLength(message, 17)
  return {
    partNumberBytes: message.payload.slice(1, 5),
    hwLevel: bcd(message.payload[5]!),
    codingIndex: bcd(message.payload[6]!),
    diagIndex: bcd(message.payload[7]!),
    busIndex: bcd(message.payload[8]!),
    manufactureMonthBcd: message.payload[9]!,
    manufactureYearBcd: message.payload[10]!,
    supplier: bcd(message.payload[11]!),
    swLevel: bcd(message.payload[12]!),
    tail: message.payload.slice(13, 17),
  }
}

/**
 * Key codes seen on the BMBT in service-mode key-function diagnostic
 * (Wilhelm `bmbt/06.md`).  `0xFF` indicates no key.  Most values are
 * BMBT button IDs in a *different numbering* from the everyday button
 * commands (`0x47`/`0x48`).
 */
export const BMBT_KEY = {
  NONE: 0xff,
  INFO_LEFT: 0x01,
  INFO_RIGHT: 0x02,
  DISC_1: 0x03,
  DISC_4: 0x04,
  DISC_2: 0x05,
  DISC_5: 0x06,
  DISC_3: 0x07,
  DISC_6: 0x08,
  FM: 0x09,
  AM: 0x10,
  MODE: 0x11,
  OVERLAY: 0x12,
  DIAL_VOL: 0x13,
  EJECT: 0x14,
  TEL: 0x16,
  TAPE_SWITCH: 0x17,
  AUX: 0x18,
  TONE: 0x19,
  SELECT: 0x20,
  BACK: 0x21,
  FORWARD: 0x22,
  MENU_LEFT: 0x23,
  MENU_RIGHT: 0x24,
  DIAL_NAV: 0x25,
} as const

export interface BMBTKeyFunctionReply {
  /** One of `BMBT_KEY.*` values, or any other observed byte; `0xFF` = none. */
  keyByte: number
  /** OBM (navigation) dial increment sensor; integer. */
  obmSensor: number
  /** Radio (volume) dial increment sensor; integer. */
  radioSensor: number
}

/**
 * Decode a `0x06` reply as the BMBT key-function diagnostic state.
 * Caller must know the preceding request was `0x05 0x0B 0x01`.
 * Frame: `[0x06, keyByte, obmSensor, radioSensor]`.
 */
export function parseBMBTKeyFunctionReply(message: IKBusMessage): BMBTKeyFunctionReply {
  assertCommand(message, CMD_BMBT_SERVICE_REPLY)
  assertPayloadLength(message, 4)
  return {
    keyByte: message.payload[1]!,
    obmSensor: message.payload[2]!,
    radioSensor: message.payload[3]!,
  }
}

export interface BMBTBrightnessReply {
  /** Raw brightness byte from the BMBT.  Per Wilhelm, the value maps to
   *  a -10..+10 slider position via a chassis-specific encoding. */
  rawByte: number
}

/**
 * Decode a `0x06` reply as the current brightness value.  Caller must
 * know the preceding request was `0x05 0x40 0x01`.  Frame: `[0x06, value]`.
 */
export function parseBMBTBrightnessReply(message: IKBusMessage): BMBTBrightnessReply {
  assertCommand(message, CMD_BMBT_SERVICE_REPLY)
  assertPayloadLength(message, 2)
  return { rawByte: message.payload[1]! }
}
