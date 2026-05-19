import { DEVICE_ADDRESSES, type DeviceAddress, type IKBusMessage } from '@emdzej/ikbus-protocol'
import { CommandPayloadError } from '../errors.js'
import { assertCommand, assertPayloadLength, makeMessage } from '../internal.js'

export const CMD_NAV_TELEMATICS_COORDINATES = 0xa2
export const CMD_NAV_TELEMATICS_LOCATION = 0xa4

/**
 * `0xA2` Telematics Coordinates — NAV broadcasts GPS coordinates (with
 * UTC time) to the telephone module, primarily for BMW Assist emergency
 * calls.  Sent at 30-second intervals when signal is locked.
 *
 * Source: Wilhelm `nav/a2.md`.  Direction NAV (`0x7F`) → Telephone
 * (`0xC8`).  Fixed 17 data bytes after the command.
 */
export interface NAVTelematicsCoordinates {
  signal: boolean
  /** Latitude in fractional degrees (positive = north). */
  latitude: number
  /** Longitude in fractional degrees (positive = east). */
  longitude: number
  /** Altitude in metres (packed BCD per Wilhelm). */
  altitudeMetres: number
  /** UTC time as separate components.  Seconds are not constrained to `:00`. */
  hour: number
  minute: number
  second: number
}

function bcd(b: number): number {
  const high = (b >> 4) & 0x0f
  const low = b & 0x0f
  if (high > 9 || low > 9) {
    throw new CommandPayloadError(`Invalid BCD byte 0x${b.toString(16).padStart(2, '0')}`)
  }
  return high * 10 + low
}

function bcdHighNibble(b: number): number {
  const n = (b >> 4) & 0x0f
  if (n > 9) throw new CommandPayloadError(`Invalid BCD high nibble in 0x${b.toString(16)}`)
  return n
}

export function parseNAVTelematicsCoordinates(message: IKBusMessage): NAVTelematicsCoordinates {
  assertCommand(message, CMD_NAV_TELEMATICS_COORDINATES)
  assertPayloadLength(message, 18)
  const signal = message.payload[1] === 0x01
  // Latitude: degrees (2 BCD bytes), minutes (1), seconds (1), fractional .0..9 + sign
  const latDeg = bcd(message.payload[2]!) * 100 + bcd(message.payload[3]!)
  const latMin = bcd(message.payload[4]!)
  const latSec = bcd(message.payload[5]!)
  const latFracTenths = bcdHighNibble(message.payload[6]!)
  const latSign = (message.payload[6]! & 0x0f) === 0x01 ? -1 : 1
  const latitude = latSign * (latDeg + latMin / 60 + (latSec + latFracTenths / 10) / 3600)
  // Longitude
  const lonDeg = bcd(message.payload[7]!) * 100 + bcd(message.payload[8]!)
  const lonMin = bcd(message.payload[9]!)
  const lonSec = bcd(message.payload[10]!)
  const lonFracTenths = bcdHighNibble(message.payload[11]!)
  const lonSign = (message.payload[11]! & 0x0f) === 0x01 ? -1 : 1
  const longitude = lonSign * (lonDeg + lonMin / 60 + (lonSec + lonFracTenths / 10) / 3600)
  // Altitude: 2 BCD bytes
  const altitudeMetres = bcd(message.payload[12]!) * 100 + bcd(message.payload[13]!)
  // payload[14] is NA
  // Time
  const hour = bcd(message.payload[15]!)
  const minute = bcd(message.payload[16]!)
  const second = bcd(message.payload[17]!)
  return { signal, latitude, longitude, altitudeMetres, hour, minute, second }
}

// ---------------------------------------------------------------------------

/**
 * `0xA4` Telematics Location — address string (city or street) for the
 * vehicle's current location.  Used alongside `0xA2` for emergency
 * calls.
 *
 * Source: Wilhelm `nav/a4.md`.  Direction NAV (`0x7F`) → Telephone
 * (`0xC8`).  Fixed 32 data bytes after the command.
 */
export const NAV_ADDRESS_TYPE = {
  CITY: 0x01,
  STREET: 0x02,
} as const

export interface NAVTelematicsLocation {
  addressType: number
  /** Null-terminated, ASCII-decoded address string. */
  address: string
}

export function parseNAVTelematicsLocation(message: IKBusMessage): NAVTelematicsLocation {
  assertCommand(message, CMD_NAV_TELEMATICS_LOCATION)
  // 1 cmd + 1 unknown + 1 type + 30 string = 33
  assertPayloadLength(message, 33)
  const addressType = message.payload[2]!
  let address = ''
  for (let i = 3; i < message.payload.length; i++) {
    const cp = message.payload[i]!
    if (cp === 0) break
    address += String.fromCharCode(cp)
  }
  return { addressType, address }
}

export interface BuildNAVTelematicsLocationArgs {
  source?: DeviceAddress
  destination?: DeviceAddress
  addressType: number
  /** ASCII; max 29 chars (padded with NULs to 30 bytes). */
  address: string
}

export function buildNAVTelematicsLocation(args: BuildNAVTelematicsLocationArgs): IKBusMessage {
  if (args.address.length > 29) {
    throw new CommandPayloadError(`Address must be ≤ 29 characters (got ${args.address.length})`)
  }
  const padded: number[] = new Array(30).fill(0)
  for (let i = 0; i < args.address.length; i++) {
    const cp = args.address.charCodeAt(i)
    if (cp > 0x7f) {
      throw new CommandPayloadError(
        `Address must be ASCII (U+${cp.toString(16).padStart(4, '0')} not allowed)`,
      )
    }
    padded[i] = cp
  }
  return makeMessage(
    args.source ?? DEVICE_ADDRESSES.NAV,
    args.destination ?? DEVICE_ADDRESSES.TEL,
    [CMD_NAV_TELEMATICS_LOCATION, 0x00, args.addressType & 0xff, ...padded],
  )
}
