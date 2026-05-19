import { decode, encode } from '@emdzej/ikbus-protocol'
import { describe, expect, it } from 'vitest'
import { CommandPayloadError } from '../../src/errors.js'
import {
  buildIKENumeric,
  IKE_NUMERIC_CLEAR,
  IKE_NUMERIC_X1,
  IKE_NUMERIC_X100_M,
  parseIKENumeric,
} from '../../src/ike/numeric.js'

describe('parseIKENumeric', () => {
  it('round-trips a value in x1 mode', () => {
    const msg = buildIKENumeric({ mode: IKE_NUMERIC_X1, value: 42 })
    expect(parseIKENumeric(decode(encode(msg)))).toEqual({
      mode: IKE_NUMERIC_X1,
      value: 42,
    })
  })

  it('round-trips a value in x100m mode', () => {
    const msg = buildIKENumeric({ mode: IKE_NUMERIC_X100_M, value: 99 })
    expect(parseIKENumeric(decode(encode(msg)))).toEqual({
      mode: IKE_NUMERIC_X100_M,
      value: 99,
    })
  })

  it('parses a clear frame', () => {
    const msg = buildIKENumeric({ mode: IKE_NUMERIC_CLEAR })
    expect(parseIKENumeric(decode(encode(msg)))).toEqual({
      mode: IKE_NUMERIC_CLEAR,
      value: undefined,
    })
  })

  it('rejects invalid BCD nibbles', () => {
    // Hand-built 0x44 frame with BCD byte 0xAF (high=A = invalid)
    const built = encode({
      source: 0x60,
      destination: 0x80,
      payload: new Uint8Array([0x44, IKE_NUMERIC_X1, 0xaf]),
      checksum: 0,
    })
    expect(() => parseIKENumeric(decode(built))).toThrow(/BCD/)
  })
})

describe('buildIKENumeric', () => {
  it('packs decimal digits as BCD nibbles', () => {
    const msg = buildIKENumeric({ mode: IKE_NUMERIC_X1, value: 25 })
    expect(msg.payload[2]).toBe(0x25)
  })

  it('rejects values out of range', () => {
    expect(() => buildIKENumeric({ mode: IKE_NUMERIC_X1, value: -1 })).toThrow(CommandPayloadError)
    expect(() => buildIKENumeric({ mode: IKE_NUMERIC_X1, value: 100 })).toThrow(CommandPayloadError)
  })

  it('rejects non-integer values', () => {
    expect(() => buildIKENumeric({ mode: IKE_NUMERIC_X1, value: 4.5 })).toThrow(CommandPayloadError)
  })

  it('requires a value for non-clear modes', () => {
    expect(() => buildIKENumeric({ mode: IKE_NUMERIC_X1 })).toThrow(CommandPayloadError)
  })

  it('zeros the value byte on a clear frame', () => {
    const msg = buildIKENumeric({ mode: IKE_NUMERIC_CLEAR })
    expect(msg.payload[2]).toBe(0x00)
  })
})
