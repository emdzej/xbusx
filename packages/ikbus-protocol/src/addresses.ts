import { InvalidAddressError } from './errors.js'
import type { DeviceAddress } from './types.js'

/**
 * Canonical device-name → address map.  Names mostly follow Wilhelm-docs;
 * BlueBus's alternative mnemonics are noted in `docs/devices/`.
 *
 * Three addresses host different devices depending on chassis and are
 * therefore not in this primary table (see `docs/devices/9b.md`,
 * `docs/devices/f5.md`, `docs/devices/sm-driver.md`):
 *   0x71  — SMF (E31) vs Mirror Memory Driver (ZKE5).  SMF_E31 included.
 *   0x9b  — CVM (E36) vs SPMFT (E46).  Use 0x9c for the E46 CVM.
 *   0xf5  — LKM2 (E31) vs SZM (most).  Not listed; resolve at runtime.
 */
export const DEVICE_ADDRESSES = {
  GM: 0x00,
  SHD: 0x08,
  CDC: 0x18,
  HKM: 0x24,
  RCC: 0x28,
  EDC: 0x2e,
  CCM: 0x30,
  GT: 0x3b,
  DIA: 0x3f,
  FBZV: 0x40,
  GTF: 0x43,
  EWS: 0x44,
  DWA: 0x45,
  CID: 0x46,
  FMBT: 0x47,
  JBIT: 0x48,
  MFL: 0x50,
  SPMBT: 0x51,
  IHKA: 0x5b,
  PDC: 0x60,
  ALC: 0x66,
  RAD: 0x68,
  EKM: 0x69,
  DSP: 0x6a,
  STH: 0x6b,
  RDC: 0x70,
  SMF_E31: 0x71,
  SM: 0x72,
  SDRS: 0x73,
  CDCD: 0x76,
  NAV: 0x7f,
  IKE: 0x80,
  ALWR: 0x9a,
  CVM: 0x9c,
  ETS: 0x9d,
  FID: 0xa0,
  MRS: 0xa4,
  FHK: 0xa7,
  EHC: 0xac,
  SES: 0xb0,
  RFIR: 0xb9,
  NAJ: 0xbb,
  GLO: 0xbf,
  MID: 0xc0,
  TEL: 0xc8,
  TCU: 0xca,
  MID_E31: 0xcd,
  LCM: 0xd0,
  SMB: 0xda,
  IRIS: 0xe0,
  ANZV: 0xe7,
  RLS: 0xe8,
  DSPC: 0xea,
  VID: 0xed,
  BMBT: 0xf0,
  LOC: 0xff,
} as const satisfies Record<string, number>

export type DeviceAddressName = keyof typeof DEVICE_ADDRESSES

const NAME_BY_ADDRESS: ReadonlyMap<number, DeviceAddressName> = new Map(
  Object.entries(DEVICE_ADDRESSES).map(([name, addr]) => [addr, name as DeviceAddressName]),
)

/**
 * Return the canonical short name for an address, or `0xNN` if unknown.
 * For chassis-dependent addresses (0x71, 0x9b, 0xf5) returns the most-common
 * variant.
 */
export function addressName(address: DeviceAddress): string {
  const name = NAME_BY_ADDRESS.get(address)
  if (name !== undefined) return name
  return `0x${address.toString(16).padStart(2, '0').toUpperCase()}`
}

/**
 * Parse a free-form address string.  Accepts:
 *   - Canonical name (case-insensitive): "MFL", "ike"
 *   - Hex with prefix:                    "0x50", "0X50"
 *   - Bare hex:                           "50", "ff", "00"
 */
export function parseAddress(input: string): DeviceAddress {
  const trimmed = input.trim()
  if (trimmed.length === 0) throw new InvalidAddressError(input)

  const upper = trimmed.toUpperCase()
  if (upper in DEVICE_ADDRESSES) {
    return DEVICE_ADDRESSES[upper as DeviceAddressName]
  }

  const hexBody = upper.startsWith('0X') ? upper.slice(2) : upper
  if (!/^[0-9A-F]+$/.test(hexBody)) throw new InvalidAddressError(input)
  const n = Number.parseInt(hexBody, 16)
  if (Number.isNaN(n) || n < 0 || n > 0xff) throw new InvalidAddressError(input)
  return n
}

/** True if the address is one of the broadcast targets (GLO or LOC). */
export function isBroadcast(address: DeviceAddress): boolean {
  return address === DEVICE_ADDRESSES.GLO || address === DEVICE_ADDRESSES.LOC
}

/** True if the address is a known multicast group. */
export function isMulticast(address: DeviceAddress): boolean {
  return address === DEVICE_ADDRESSES.ANZV
}
