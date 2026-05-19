import { decode, encode } from '@emdzej/ibusx-protocol'
import { describe, expect, it } from 'vitest'
import { CommandPayloadError } from '../../src/errors.js'
import { buildIKEOBCText, IKE_OBC_PROPERTY, parseIKEOBCText } from '../../src/ike/obc-text.js'

describe('parseIKEOBCText', () => {
  it('decodes the Wilhelm time example ( 3:43PM )', () => {
    // 80 0C E7 24 01 00 20 33 3A 34 33 50 4D 7D
    const msg = decode(
      new Uint8Array([
        0x80, 0x0c, 0xe7, 0x24, 0x01, 0x00, 0x20, 0x33, 0x3a, 0x34, 0x33, 0x50, 0x4d, 0x7d,
      ]),
    )
    expect(parseIKEOBCText(msg)).toEqual({
      propertyId: IKE_OBC_PROPERTY.TIME,
      text: ' 3:43PM',
    })
  })

  it('decodes the Wilhelm date example (05/25/2020)', () => {
    // 80 0F E7 24 02 00 30 35 2F 32 35 2F 32 30 32 30 4C
    const msg = decode(
      new Uint8Array([
        0x80, 0x0f, 0xe7, 0x24, 0x02, 0x00, 0x30, 0x35, 0x2f, 0x32, 0x35, 0x2f, 0x32, 0x30, 0x32,
        0x30, 0x4c,
      ]),
    )
    expect(parseIKEOBCText(msg)).toEqual({
      propertyId: IKE_OBC_PROPERTY.DATE,
      text: '05/25/2020',
    })
  })

  it('trims trailing spaces', () => {
    const msg = buildIKEOBCText({ propertyId: IKE_OBC_PROPERTY.TIMER, text: '45.6  SEC ' })
    expect(parseIKEOBCText(decode(encode(msg))).text).toBe('45.6  SEC')
  })
})

describe('buildIKEOBCText', () => {
  it('round-trips a typical frame', () => {
    const args = { propertyId: IKE_OBC_PROPERTY.TEMPERATURE, text: '+12.3' }
    expect(parseIKEOBCText(decode(encode(buildIKEOBCText(args))))).toEqual(args)
  })

  it('rejects non-ASCII text', () => {
    expect(() => buildIKEOBCText({ propertyId: 0x01, text: 'café' })).toThrow(CommandPayloadError)
  })

  it('rejects property IDs outside byte range', () => {
    expect(() => buildIKEOBCText({ propertyId: -1, text: 'x' })).toThrow(CommandPayloadError)
    expect(() => buildIKEOBCText({ propertyId: 256, text: 'x' })).toThrow(CommandPayloadError)
  })

  it('writes the documented 0x00 separator at payload[2]', () => {
    const msg = buildIKEOBCText({ propertyId: 0x01, text: 'X' })
    expect(msg.payload[2]).toBe(0x00)
  })
})
