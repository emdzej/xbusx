import type { DBusMessage, DeviceAddress } from '@emdzej/dbus-protocol'
import { encode } from '@emdzej/dbus-protocol'
import { parseResponse, RESPONSE } from '../responses.js'

/**
 * DS2 "read identification" command byte. The community DS2 lore (and the
 * `handmade0octopus/ds2` Arduino library) treats `0x00` as the canonical
 * ECU-identification request — verified against the navcoder builder
 * algorithm at `ibus.bas:600–644`. See `docs/protocol/dbus.md` § "Worked
 * examples / ECU-identification request".
 */
export const CMD_READ_IDENTIFICATION = 0x00

export interface ReadIdentificationRequestArgs {
  /** Destination ECU address (e.g. `DBUS_ADDRESSES.DME = 0x12`). */
  readonly destination: DeviceAddress
}

/**
 * Build a `0x00` read-identification request frame.
 *
 * Wire bytes for DME (`0x12`):  `12 04 00 16`.
 */
export function buildReadIdentificationRequest(args: ReadIdentificationRequestArgs): Uint8Array {
  return encode({
    destination: args.destination,
    payload: new Uint8Array([CMD_READ_IDENTIFICATION]),
    checksum: 0,
  })
}

/**
 * A parsed positive ECU-identification response. The DS2 reply structure is
 * ECU-specific — different controllers pack different fields after the
 * `0xA0` positive-ACK byte. This shape preserves the raw bytes so callers
 * (or per-ECU device twins) can decode them with chassis-specific knowledge.
 */
export interface ECUIdentification {
  /** Raw bytes following the `0xA0` positive-ACK marker. */
  readonly data: Uint8Array
}

/**
 * Parse a `0xA0`-positive ECU-identification response. Throws if the
 * response is not a positive ACK — use `parseResponse()` from
 * `../responses.js` if you need to handle the negative cases yourself.
 */
export function parseECUIdentification(message: DBusMessage): ECUIdentification {
  const parsed = parseResponse(message)
  if (parsed.kind !== 'positive') {
    throw new Error(
      `Expected positive ACK (0xA0), got 0x${(message.payload[0] ?? 0).toString(16).padStart(2, '0')}`,
    )
  }
  return { data: parsed.data }
}

/** Re-export for callers that want to check raw codes after building. */
export const READ_IDENTIFICATION_POSITIVE = RESPONSE.POSITIVE_ACK
