import { describe, expect, it } from 'vitest'
import { addressName, DBUS_ADDRESSES, isTester, parseAddress } from '../src/addresses.js'
import { DBusInvalidAddressError } from '../src/errors.js'

describe('addressName', () => {
  it('returns the canonical short name for known addresses', () => {
    expect(addressName(DBUS_ADDRESSES.DME)).toBe('DME')
    expect(addressName(DBUS_ADDRESSES.TESTER)).toBe('TESTER')
  })

  it('returns the 0xNN form for unknown addresses', () => {
    expect(addressName(0xab)).toBe('0xAB')
  })
})

describe('parseAddress', () => {
  it('accepts the canonical name (case-insensitive)', () => {
    expect(parseAddress('DME')).toBe(0x12)
    expect(parseAddress('dme')).toBe(0x12)
    expect(parseAddress('Tester')).toBe(0xf1)
  })

  it('accepts hex with and without prefix', () => {
    expect(parseAddress('0x12')).toBe(0x12)
    expect(parseAddress('0X12')).toBe(0x12)
    expect(parseAddress('12')).toBe(0x12)
    expect(parseAddress('ff')).toBe(0xff)
  })

  it('throws on empty or garbage input', () => {
    expect(() => parseAddress('')).toThrow(DBusInvalidAddressError)
    expect(() => parseAddress('   ')).toThrow(DBusInvalidAddressError)
    expect(() => parseAddress('xyz')).toThrow(DBusInvalidAddressError)
    expect(() => parseAddress('0x100')).toThrow(DBusInvalidAddressError)
  })
})

describe('isTester', () => {
  it('returns true only for the tester address', () => {
    expect(isTester(0xf1)).toBe(true)
    expect(isTester(0x12)).toBe(false)
  })
})
