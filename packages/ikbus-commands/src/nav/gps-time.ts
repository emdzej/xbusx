import { DEVICE_ADDRESSES, type DeviceAddress, type IKBusMessage } from '@emdzej/ikbus-protocol'
import { CommandPayloadError } from '../errors.js'
import { assertCommand, assertPayloadLength, makeMessage } from '../internal.js'

export const CMD_GPS_TIME = 0x1f

/**
 * GPS time/date broadcast from the navigation computer to the cluster.
 *
 * Per Wilhelm `nav/1f.md`: 8-byte payload (after the `0x1F` command),
 * packed-BCD time and date, sent at the top of every minute when GPS is
 * locked.  Direction: NAV (`0x7F`) → IKE (`0x80`).  Time is **UTC**.
 *
 * Frame layout (payload indices, 0-based, excluding the command byte at
 * index 0):
 *
 *   index 1  flags / unknown   default 0x40 in observed frames
 *   index 2  hour              packed BCD
 *   index 3  minute            packed BCD
 *   index 4  day               packed BCD
 *   index 5  unknown           default 0x00 in observed frames
 *   index 6  month             packed BCD
 *   index 7  year (high byte)  packed BCD, e.g. `0x20` for 2019
 *   index 8  year (low byte)   packed BCD, e.g. `0x19` for 2019
 *
 * **Year limitations:** Wilhelm notes the GPS Week Number Rollover issue
 * affecting older nav units (re-reporting epoch-1 dates as epoch-2
 * dates).  This codec does not apply any rollover correction — the
 * caller must compensate if it cares.
 */
export interface GPSTime {
  /** 0..23 */
  hour: number
  /** 0..59 */
  minute: number
  /** 1..31 */
  day: number
  /** 1..12 */
  month: number
  /** Four-digit year (decoded from the two BCD bytes; e.g. 2019). */
  year: number
  /**
   * The flags byte at payload index 1.  Observed default is `0x40`.
   * Surfaced raw because Wilhelm doesn't document its bit-meanings.
   */
  flagsRaw: number
  /**
   * The byte at payload index 5.  Observed default is `0x00`.  Surfaced
   * raw for the same reason as `flagsRaw`.
   */
  unknownRaw: number
}

function bcdToDecimal(byte: number): number {
  const high = (byte >> 4) & 0x0f
  const low = byte & 0x0f
  if (high > 9 || low > 9) {
    throw new CommandPayloadError(`Invalid BCD byte 0x${byte.toString(16).padStart(2, '0')}`)
  }
  return high * 10 + low
}

function decimalToBcd(value: number, fieldName: string): number {
  if (!Number.isInteger(value) || value < 0 || value > 99) {
    throw new CommandPayloadError(`${fieldName} ${value} out of BCD range 0..99`)
  }
  return ((Math.floor(value / 10) << 4) | (value % 10)) & 0xff
}

/** Parse a `0x1F` GPS time frame.  Total payload length is exactly 9 bytes. */
export function parseGPSTime(message: IKBusMessage): GPSTime {
  assertCommand(message, CMD_GPS_TIME)
  assertPayloadLength(message, 9)
  const flagsRaw = message.payload[1]!
  const hour = bcdToDecimal(message.payload[2]!)
  const minute = bcdToDecimal(message.payload[3]!)
  const day = bcdToDecimal(message.payload[4]!)
  const unknownRaw = message.payload[5]!
  const month = bcdToDecimal(message.payload[6]!)
  const yearHi = bcdToDecimal(message.payload[7]!)
  const yearLo = bcdToDecimal(message.payload[8]!)
  // Years are two BCD bytes representing the four decimal digits.
  // 0x20 0x19 → 2019.
  const year = yearHi * 100 + yearLo
  if (hour > 23) throw new CommandPayloadError(`Hour ${hour} out of range`)
  if (minute > 59) throw new CommandPayloadError(`Minute ${minute} out of range`)
  if (day < 1 || day > 31) throw new CommandPayloadError(`Day ${day} out of range`)
  if (month < 1 || month > 12) throw new CommandPayloadError(`Month ${month} out of range`)
  return { hour, minute, day, month, year, flagsRaw, unknownRaw }
}

export interface BuildGPSTimeArgs {
  source?: DeviceAddress
  destination?: DeviceAddress
  hour: number
  minute: number
  day: number
  month: number
  year: number
  /** Defaults to the observed `0x40` value if omitted. */
  flagsRaw?: number
  /** Defaults to the observed `0x00` value if omitted. */
  unknownRaw?: number
}

/**
 * Build a `0x1F` GPS time broadcast.  Default direction NAV → IKE.
 *
 * The two "unknown" bytes default to the values seen in every Wilhelm
 * example (`0x40` and `0x00`).  Override only if you have evidence they
 * carry meaning on the chassis you're targeting.
 */
export function buildGPSTime(args: BuildGPSTimeArgs): IKBusMessage {
  if (args.year < 0 || args.year > 9999) {
    throw new CommandPayloadError(`Year ${args.year} out of 4-digit range`)
  }
  if (args.hour < 0 || args.hour > 23) {
    throw new CommandPayloadError(`Hour ${args.hour} out of range 0..23`)
  }
  if (args.minute < 0 || args.minute > 59) {
    throw new CommandPayloadError(`Minute ${args.minute} out of range 0..59`)
  }
  if (args.day < 1 || args.day > 31) {
    throw new CommandPayloadError(`Day ${args.day} out of range 1..31`)
  }
  if (args.month < 1 || args.month > 12) {
    throw new CommandPayloadError(`Month ${args.month} out of range 1..12`)
  }
  const yearHiDec = Math.floor(args.year / 100)
  const yearLoDec = args.year % 100
  const flagsRaw = args.flagsRaw ?? 0x40
  const unknownRaw = args.unknownRaw ?? 0x00
  if (flagsRaw < 0 || flagsRaw > 0xff) {
    throw new CommandPayloadError(`flagsRaw 0x${flagsRaw.toString(16)} out of byte range`)
  }
  if (unknownRaw < 0 || unknownRaw > 0xff) {
    throw new CommandPayloadError(`unknownRaw 0x${unknownRaw.toString(16)} out of byte range`)
  }
  return makeMessage(
    args.source ?? DEVICE_ADDRESSES.NAV,
    args.destination ?? DEVICE_ADDRESSES.IKE,
    [
      CMD_GPS_TIME,
      flagsRaw,
      decimalToBcd(args.hour, 'hour'),
      decimalToBcd(args.minute, 'minute'),
      decimalToBcd(args.day, 'day'),
      unknownRaw,
      decimalToBcd(args.month, 'month'),
      decimalToBcd(yearHiDec, 'yearHi'),
      decimalToBcd(yearLoDec, 'yearLo'),
    ],
  )
}
