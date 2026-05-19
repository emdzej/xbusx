import { DBusInvalidAddressError } from './errors.js'
import type { DeviceAddress } from './types.js'

/**
 * D-bus (BMW DS2) ECU address registry.
 *
 * Sourced from navcoder's address-name lookup `ibus.bas:895–2094` and
 * cross-referenced with `docs/protocol/dbus.md`. Two of these (IKE, LCM)
 * are dual-presence with I/K-bus — same address byte, disjoint command
 * vocabulary on each bus.
 *
 * Chassis-conditional mappings (AB, ASC, EKP, LWS, AHL) are documented in
 * `docs/protocol/dbus.md` as gaps requiring EDIABAS cross-check before
 * relying on a fixed address. They are deliberately omitted from this
 * primary table.
 */
export const DBUS_ADDRESSES = {
  /** Digital motor electronics (engine controller). */
  DME: 0x12,
  /** Electronic transmission control. */
  EGS: 0x14,
  /** Instrument cluster — dual-presence with I/K-bus. */
  IKE: 0x80,
  /** Light control module — dual-presence with I/K-bus. */
  LCM: 0xd0,
  /** Tester address (the PC running diagnostics). */
  TESTER: 0xf1,
} as const satisfies Record<string, number>

export type DBusAddressName = keyof typeof DBUS_ADDRESSES

const NAME_BY_ADDRESS: ReadonlyMap<number, DBusAddressName> = new Map(
  Object.entries(DBUS_ADDRESSES).map(([name, addr]) => [addr, name as DBusAddressName]),
)

/** Return the canonical short name for an address, or `0xNN` if unknown. */
export function addressName(address: DeviceAddress): string {
  const name = NAME_BY_ADDRESS.get(address)
  if (name !== undefined) return name
  return `0x${address.toString(16).padStart(2, '0').toUpperCase()}`
}

/**
 * Parse a free-form address string. Accepts:
 *   - Canonical name (case-insensitive): "DME", "tester"
 *   - Hex with prefix:                   "0x12", "0X12"
 *   - Bare hex:                          "12", "f1"
 */
export function parseAddress(input: string): DeviceAddress {
  const trimmed = input.trim()
  if (trimmed.length === 0) throw new DBusInvalidAddressError(input)

  const upper = trimmed.toUpperCase()
  if (upper in DBUS_ADDRESSES) {
    return DBUS_ADDRESSES[upper as DBusAddressName]
  }

  const hexBody = upper.startsWith('0X') ? upper.slice(2) : upper
  if (!/^[0-9A-F]+$/.test(hexBody)) throw new DBusInvalidAddressError(input)
  const n = Number.parseInt(hexBody, 16)
  if (Number.isNaN(n) || n < 0 || n > 0xff) throw new DBusInvalidAddressError(input)
  return n
}

/** True if the address is the tester (PC) — used to detect ECU → tester direction. */
export function isTester(address: DeviceAddress): boolean {
  return address === DBUS_ADDRESSES.TESTER
}
