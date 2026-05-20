import type { DBusMessage, DeviceAddress } from '@emdzej/dbus-protocol'
import { encode } from '@emdzej/dbus-protocol'
import { parseResponse } from '../responses.js'

/**
 * DS2 "read coding data" command — the **coding string** that NCS / NCS
 * Expert / E-Sys consult to know how a given ECU is configured. Length
 * varies by ECU (typically 8–32 bytes).
 *
 * Source: navcoder `Proc_5_5_4998B0` (`ibus.bas:3214–3725`) — see
 * `docs/protocol/dbus.md` § "Tester → ECU requests".
 */
export const CMD_READ_CODING = 0x08

/**
 * DS2 "request coding data checksum" — verifies that the coding string
 * stored in the ECU still matches its expected hash.  Useful as a
 * before/after probe around any coding write.
 */
export const CMD_READ_CODING_CHECKSUM = 0x0a

export interface CodingRequestArgs {
  readonly destination: DeviceAddress
}

/**
 * Build a `0x08` read-coding-data request.  Wire bytes for DME (`0x12`):
 * `12 04 08 1E`.
 */
export function buildReadCodingRequest(args: CodingRequestArgs): Uint8Array {
  return encode({
    destination: args.destination,
    payload: new Uint8Array([CMD_READ_CODING]),
    checksum: 0,
  })
}

/** Build a `0x0A` read-coding-checksum request. */
export function buildReadCodingChecksumRequest(args: CodingRequestArgs): Uint8Array {
  return encode({
    destination: args.destination,
    payload: new Uint8Array([CMD_READ_CODING_CHECKSUM]),
    checksum: 0,
  })
}

/**
 * A parsed read-coding-data response. The per-byte semantics of the
 * coding string are **ECU- and chassis-specific** — EDIABAS PRG files
 * (or NCS Expert profiles) decode them authoritatively. For now we keep
 * the raw bytes so callers can inspect or persist them verbatim.
 */
export interface CodingRead {
  /** Raw coding bytes following the `0xA0` positive-ACK marker. */
  readonly data: Uint8Array
}

/**
 * Parse a positive-ACK read-coding response. Throws on non-positive
 * responses — use `parseResponse()` from `../responses.js` if you need
 * to handle the negative cases.
 */
export function parseCodingResponse(message: DBusMessage): CodingRead {
  const parsed = parseResponse(message)
  if (parsed.kind !== 'positive') {
    throw new Error(
      `Expected positive ACK (0xA0), got 0x${(message.payload[0] ?? 0).toString(16).padStart(2, '0')}`,
    )
  }
  return { data: parsed.data }
}
