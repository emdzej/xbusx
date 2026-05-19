import { decode, encode } from '@emdzej/ibusx-protocol'
import { describe, expect, it } from 'vitest'
import { CommandPayloadError } from '../../src/errors.js'
import { buildGPSTime, parseGPSTime } from '../../src/nav/gps-time.js'

describe('parseGPSTime', () => {
  it('decodes the Wilhelm worked example (10:18, 27 Jan 2019)', () => {
    // 7F 0B 80 1F 40 10 18 27 00 01 20 19 BC
    const msg = decode(
      new Uint8Array([
        0x7f, 0x0b, 0x80, 0x1f, 0x40, 0x10, 0x18, 0x27, 0x00, 0x01, 0x20, 0x19, 0xbc,
      ]),
    )
    expect(parseGPSTime(msg)).toEqual({
      hour: 10,
      minute: 18,
      day: 27,
      month: 1,
      year: 2019,
      flagsRaw: 0x40,
      unknownRaw: 0x00,
    })
  })

  it('decodes the first Wilhelm example (07:16, 26 Jan 2019)', () => {
    // 7F 0B 80 1F 40 07 16 26 00 01 20 19 A4
    const msg = decode(
      new Uint8Array([
        0x7f, 0x0b, 0x80, 0x1f, 0x40, 0x07, 0x16, 0x26, 0x00, 0x01, 0x20, 0x19, 0xa4,
      ]),
    )
    const t = parseGPSTime(msg)
    expect(t.hour).toBe(7)
    expect(t.minute).toBe(16)
    expect(t.day).toBe(26)
    expect(t.year).toBe(2019)
  })

  it('decodes the third Wilhelm example (12:30, 17 Mar 2000)', () => {
    // 7F 0B 80 1F 40 12 30 17 00 03 20 00 BD
    const msg = decode(
      new Uint8Array([
        0x7f, 0x0b, 0x80, 0x1f, 0x40, 0x12, 0x30, 0x17, 0x00, 0x03, 0x20, 0x00, 0xbd,
      ]),
    )
    expect(parseGPSTime(msg)).toEqual({
      hour: 12,
      minute: 30,
      day: 17,
      month: 3,
      year: 2000,
      flagsRaw: 0x40,
      unknownRaw: 0x00,
    })
  })

  it('rejects an out-of-range hour BCD', () => {
    // hh byte = 0x24 (decimal 24, invalid)
    const built = encode({
      source: 0x7f,
      destination: 0x80,
      payload: new Uint8Array([0x1f, 0x40, 0x24, 0x00, 0x01, 0x00, 0x01, 0x20, 0x00]),
      checksum: 0,
    })
    expect(() => parseGPSTime(decode(built))).toThrow(/Hour/)
  })

  it('rejects malformed BCD nibbles', () => {
    // 0xAB has nibbles A=10 and B=11, neither valid BCD
    const built = encode({
      source: 0x7f,
      destination: 0x80,
      payload: new Uint8Array([0x1f, 0x40, 0xab, 0x00, 0x01, 0x00, 0x01, 0x20, 0x00]),
      checksum: 0,
    })
    expect(() => parseGPSTime(decode(built))).toThrow(/BCD/)
  })
})

describe('buildGPSTime', () => {
  it('round-trips a typical timestamp', () => {
    const args = {
      hour: 10,
      minute: 18,
      day: 27,
      month: 1,
      year: 2019,
      flagsRaw: 0x40,
      unknownRaw: 0x00,
    }
    expect(parseGPSTime(decode(encode(buildGPSTime(args))))).toEqual(args)
  })

  it('defaults the unknown bytes to the Wilhelm-observed values', () => {
    const msg = buildGPSTime({ hour: 0, minute: 0, day: 1, month: 1, year: 2000 })
    expect(msg.payload[1]).toBe(0x40)
    expect(msg.payload[5]).toBe(0x00)
  })

  it('packs the year as two BCD bytes', () => {
    const msg = buildGPSTime({ hour: 0, minute: 0, day: 1, month: 1, year: 2019 })
    expect(msg.payload[7]).toBe(0x20)
    expect(msg.payload[8]).toBe(0x19)
  })

  it('rejects out-of-range time fields', () => {
    expect(() => buildGPSTime({ hour: 24, minute: 0, day: 1, month: 1, year: 2000 })).toThrow(
      CommandPayloadError,
    )
    expect(() => buildGPSTime({ hour: 0, minute: 60, day: 1, month: 1, year: 2000 })).toThrow(
      CommandPayloadError,
    )
    expect(() => buildGPSTime({ hour: 0, minute: 0, day: 0, month: 1, year: 2000 })).toThrow(
      CommandPayloadError,
    )
    expect(() => buildGPSTime({ hour: 0, minute: 0, day: 32, month: 1, year: 2000 })).toThrow(
      CommandPayloadError,
    )
    expect(() => buildGPSTime({ hour: 0, minute: 0, day: 1, month: 0, year: 2000 })).toThrow(
      CommandPayloadError,
    )
    expect(() => buildGPSTime({ hour: 0, minute: 0, day: 1, month: 13, year: 2000 })).toThrow(
      CommandPayloadError,
    )
  })

  it('rejects out-of-range year', () => {
    expect(() => buildGPSTime({ hour: 0, minute: 0, day: 1, month: 1, year: -1 })).toThrow(
      CommandPayloadError,
    )
    expect(() => buildGPSTime({ hour: 0, minute: 0, day: 1, month: 1, year: 10000 })).toThrow(
      CommandPayloadError,
    )
  })
})
