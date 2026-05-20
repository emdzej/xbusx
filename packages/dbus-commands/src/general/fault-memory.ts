import type { DBusMessage, DeviceAddress } from '@emdzej/dbus-protocol'
import { encode } from '@emdzej/dbus-protocol'
import { parseResponse } from '../responses.js'

/**
 * DS2 "read fault memory" command — returns the active DTC list.
 *
 * Source: navcoder `Proc_5_5_4998B0` (`ibus.bas:3214–3725`, the DS2
 * command-name lookup) maps `0x04` to "Read fault memory". See
 * `docs/protocol/dbus.md` § "Tester → ECU requests".
 */
export const CMD_READ_FAULT_MEMORY = 0x04

/**
 * DS2 "clear fault memory" command — wipes the DTC list. ECU replies
 * with a positive ACK (no payload) when the clear succeeded.
 */
export const CMD_CLEAR_FAULT_MEMORY = 0x05

/**
 * DS2 "read fault shadow memory" command — historic (cleared-but-recorded)
 * DTCs. Same response shape as `0x04`.
 */
export const CMD_READ_FAULT_SHADOW_MEMORY = 0x14

export interface FaultMemoryRequestArgs {
  readonly destination: DeviceAddress
}

/**
 * Build a `0x04` read-fault-memory request.  Wire bytes for DME (`0x12`):
 * `12 04 04 12`.
 */
export function buildReadFaultMemoryRequest(args: FaultMemoryRequestArgs): Uint8Array {
  return encode({
    destination: args.destination,
    payload: new Uint8Array([CMD_READ_FAULT_MEMORY]),
    checksum: 0,
  })
}

/**
 * Build a `0x05` clear-fault-memory request.  Wire bytes for DME (`0x12`):
 * `12 04 05 13`.
 */
export function buildClearFaultMemoryRequest(args: FaultMemoryRequestArgs): Uint8Array {
  return encode({
    destination: args.destination,
    payload: new Uint8Array([CMD_CLEAR_FAULT_MEMORY]),
    checksum: 0,
  })
}

/**
 * Build a `0x14` read-fault-shadow-memory request — same shape as `0x04`
 * but returns historic (already-cleared) DTCs.
 */
export function buildReadFaultShadowMemoryRequest(args: FaultMemoryRequestArgs): Uint8Array {
  return encode({
    destination: args.destination,
    payload: new Uint8Array([CMD_READ_FAULT_SHADOW_MEMORY]),
    checksum: 0,
  })
}

/**
 * A parsed read-fault-memory response. The DTC byte layout is **ECU-
 * specific** (DME, EGS, ABS, etc. each pack codes differently — usually a
 * count byte followed by N×{code-hi, code-lo, status} records, but
 * variations exist). This shape preserves the raw payload so per-ECU
 * decoders can interpret it.
 */
export interface FaultMemoryRead {
  /** Raw bytes following the `0xA0` positive-ACK marker. */
  readonly data: Uint8Array
}

/**
 * Parse a positive-ACK fault-memory response (works for both `0x04` and
 * `0x14`). Throws if the response is not a positive ACK — use
 * `parseResponse()` from `../responses.js` to handle the negative cases
 * yourself.
 */
export function parseFaultMemoryResponse(message: DBusMessage): FaultMemoryRead {
  const parsed = parseResponse(message)
  if (parsed.kind !== 'positive') {
    throw new Error(
      `Expected positive ACK (0xA0), got 0x${(message.payload[0] ?? 0).toString(16).padStart(2, '0')}`,
    )
  }
  return { data: parsed.data }
}
