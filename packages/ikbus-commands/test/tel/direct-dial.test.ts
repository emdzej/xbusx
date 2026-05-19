import { decode, encode } from '@emdzej/ikbus-protocol'
import { describe, expect, it } from 'vitest'
import { CommandPayloadError } from '../../src/errors.js'
import { buildTELDirectDial, parseTELDirectDial } from '../../src/tel/direct-dial.js'

describe('TEL Direct Dial 0x2D', () => {
  it('decodes Wilhelm BMW Germany example', () => {
    // 3B 13 C8 2D 00 11 2B 34 39 38 39 31 32 35 30 31 36 30 30 30 CA
    const msg = decode(
      new Uint8Array([
        0x3b, 0x13, 0xc8, 0x2d, 0x00, 0x11, 0x2b, 0x34, 0x39, 0x38, 0x39, 0x31, 0x32, 0x35, 0x30,
        0x31, 0x36, 0x30, 0x30, 0x30, 0xca,
      ]),
    )
    expect(parseTELDirectDial(msg)).toEqual({
      reservedHeader: [0x00, 0x11],
      phoneNumber: '+4989125016000',
    })
  })

  it('round-trips a number', () => {
    const msg = buildTELDirectDial({ phoneNumber: '+18008311117' })
    expect(parseTELDirectDial(decode(encode(msg))).phoneNumber).toBe('+18008311117')
  })

  it('rejects non-ASCII', () => {
    expect(() => buildTELDirectDial({ phoneNumber: '∞' })).toThrow(CommandPayloadError)
  })
})
