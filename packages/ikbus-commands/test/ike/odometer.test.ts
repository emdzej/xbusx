import { decode, encode } from '@emdzej/ikbus-protocol'
import { describe, expect, it } from 'vitest'
import { CommandPayloadError } from '../../src/errors.js'
import { buildOdometer, parseOdometer } from '../../src/ike/odometer.js'

describe('parseOdometer', () => {
  it('decodes the Wilhelm worked example: 799 994 km', () => {
    // 80 0A BF 17 FA 34 0C 00 1F 32 CC 01
    const msg = decode(
      new Uint8Array([0x80, 0x0a, 0xbf, 0x17, 0xfa, 0x34, 0x0c, 0x00, 0x1f, 0x32, 0xcc, 0x01]),
    )
    expect(parseOdometer(msg)).toBe(799994)
  })
})

describe('buildOdometer', () => {
  it('round-trips a typical mileage', () => {
    const built = buildOdometer({ km: 123456 })
    expect(parseOdometer(decode(encode(built)))).toBe(123456)
  })

  it('round-trips zero', () => {
    expect(parseOdometer(decode(encode(buildOdometer({ km: 0 }))))).toBe(0)
  })

  it('round-trips the maximum 24-bit value', () => {
    expect(parseOdometer(decode(encode(buildOdometer({ km: 0xffffff }))))).toBe(0xffffff)
  })

  it('throws on out-of-range mileage', () => {
    expect(() => buildOdometer({ km: -1 })).toThrow(CommandPayloadError)
    expect(() => buildOdometer({ km: 0x1000000 })).toThrow(CommandPayloadError)
  })

  it('produces little-endian byte order', () => {
    const msg = buildOdometer({ km: 0x123456 })
    // bytes 1-3 should be 0x56, 0x34, 0x12 (LO, MID, HI)
    expect(msg.payload[1]).toBe(0x56)
    expect(msg.payload[2]).toBe(0x34)
    expect(msg.payload[3]).toBe(0x12)
  })
})
