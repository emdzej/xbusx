import { describe, expect, it } from 'vitest'
import { addressName, isBroadcast, isMulticast, parseAddress } from '../src/addresses.js'
import { InvalidAddressError } from '../src/errors.js'

describe('addressName', () => {
  it('resolves known addresses to their canonical name', () => {
    expect(addressName(0x80)).toBe('IKE')
    expect(addressName(0x68)).toBe('RAD')
    expect(addressName(0xbf)).toBe('GLO')
    expect(addressName(0x00)).toBe('GM')
  })

  it('returns a hex string for unknown addresses', () => {
    expect(addressName(0x99)).toBe('0x99')
    expect(addressName(0x01)).toBe('0x01')
  })
})

describe('parseAddress', () => {
  it('accepts canonical names case-insensitively', () => {
    expect(parseAddress('MFL')).toBe(0x50)
    expect(parseAddress('IKE')).toBe(0x80)
    expect(parseAddress('rad')).toBe(0x68)
    expect(parseAddress('  IKE  ')).toBe(0x80)
  })

  it('accepts 0x-prefixed hex', () => {
    expect(parseAddress('0x80')).toBe(0x80)
    expect(parseAddress('0X80')).toBe(0x80)
  })

  it('accepts bare hex', () => {
    expect(parseAddress('80')).toBe(0x80)
    expect(parseAddress('ff')).toBe(0xff)
    expect(parseAddress('00')).toBe(0x00)
  })

  it('throws on empty or invalid input', () => {
    expect(() => parseAddress('')).toThrow(InvalidAddressError)
    expect(() => parseAddress('   ')).toThrow(InvalidAddressError)
    expect(() => parseAddress('XYZ')).toThrow(InvalidAddressError)
    expect(() => parseAddress('0xGG')).toThrow(InvalidAddressError)
  })

  it('throws on out-of-range values', () => {
    expect(() => parseAddress('0x100')).toThrow(InvalidAddressError)
    expect(() => parseAddress('100')).toThrow(InvalidAddressError) // hex 0x100 = 256
  })
})

describe('isBroadcast', () => {
  it('matches GLO and LOC', () => {
    expect(isBroadcast(0xbf)).toBe(true)
    expect(isBroadcast(0xff)).toBe(true)
  })

  it('rejects non-broadcast addresses', () => {
    expect(isBroadcast(0x80)).toBe(false)
    expect(isBroadcast(0xe7)).toBe(false)
  })
})

describe('isMulticast', () => {
  it('matches ANZV', () => {
    expect(isMulticast(0xe7)).toBe(true)
  })

  it('rejects non-multicast addresses', () => {
    expect(isMulticast(0xbf)).toBe(false)
  })
})
