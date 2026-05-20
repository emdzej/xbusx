import type { DeviceAddress } from '@emdzej/dbus-protocol'
import { encode } from '@emdzej/dbus-protocol'

/**
 * DS2 "reset control unit" — soft-resets the addressed ECU. The ECU
 * typically positive-ACKs and then re-initialises; subsequent traffic
 * may briefly fail until the ECU is ready again.
 *
 * Source: navcoder `Proc_5_5_4998B0` (`ibus.bas:3214–3725`).
 */
export const CMD_RESET_CONTROL_UNIT = 0x12

/**
 * DS2 "terminate diagnostic mode" — politely ends the DS2 session. The
 * ECU positive-ACKs and goes back to its normal runtime state. Some
 * tools issue this as cleanup before disconnecting.
 *
 * Note: per the response-code table this byte also appears as a
 * response code (`0x9F`) the ECU may send when it terminates the
 * session itself. Direction (tester→ECU vs ECU→tester) disambiguates.
 */
export const CMD_TERMINATE_DIAGNOSTIC = 0x9f

export interface LifecycleRequestArgs {
  readonly destination: DeviceAddress
}

/**
 * Build a `0x12` reset-control-unit request. Wire bytes for DME (`0x12`):
 * `12 04 12 04`.
 */
export function buildResetControlUnitRequest(args: LifecycleRequestArgs): Uint8Array {
  return encode({
    destination: args.destination,
    payload: new Uint8Array([CMD_RESET_CONTROL_UNIT]),
    checksum: 0,
  })
}

/**
 * Build a `0x9F` terminate-diagnostic request. Wire bytes for DME
 * (`0x12`): `12 04 9F 89`.
 */
export function buildTerminateDiagnosticRequest(args: LifecycleRequestArgs): Uint8Array {
  return encode({
    destination: args.destination,
    payload: new Uint8Array([CMD_TERMINATE_DIAGNOSTIC]),
    checksum: 0,
  })
}
