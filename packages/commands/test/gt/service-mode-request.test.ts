import { decode, encode } from '@emdzej/ibusx-protocol'
import { describe, expect, it } from 'vitest'
import { CommandPayloadError } from '../../src/errors.js'
import {
  BMBT_SERVICE_PROPERTY,
  buildBMBTServiceRequest,
  parseBMBTServiceRequest,
} from '../../src/gt/service-mode-request.js'

describe('parseBMBTServiceRequest', () => {
  it('decodes Wilhelm ident request (3B 04 F0 05 00 CA)', () => {
    const msg = decode(new Uint8Array([0x3b, 0x04, 0xf0, 0x05, 0x00, 0xca]))
    const parsed = parseBMBTServiceRequest(msg)
    expect(parsed.property).toBe(BMBT_SERVICE_PROPERTY.IDENT_REQUEST)
    expect(Array.from(parsed.data)).toEqual([])
  })

  it('decodes Wilhelm key-function request (3B 05 F0 05 0B 01 C1)', () => {
    const msg = decode(new Uint8Array([0x3b, 0x05, 0xf0, 0x05, 0x0b, 0x01, 0xc1]))
    const parsed = parseBMBTServiceRequest(msg)
    expect(parsed.property).toBe(BMBT_SERVICE_PROPERTY.KEY_FUNCTION_REQUEST)
    expect(Array.from(parsed.data)).toEqual([0x01])
  })

  it('decodes Wilhelm brightness set (3B 06 F0 05 41 01 6C E4)', () => {
    const msg = decode(new Uint8Array([0x3b, 0x06, 0xf0, 0x05, 0x41, 0x01, 0x6c, 0xe4]))
    const parsed = parseBMBTServiceRequest(msg)
    expect(parsed.property).toBe(BMBT_SERVICE_PROPERTY.BRIGHTNESS_SET_BMBT)
    expect(Array.from(parsed.data)).toEqual([0x01, 0x6c])
  })

  it('rejects a frame without a property byte', () => {
    // Just `[0x05]` payload — should fail the min-length check
    const built = encode({
      source: 0x3b,
      destination: 0xf0,
      payload: new Uint8Array([0x05]),
      checksum: 0,
    })
    expect(() => parseBMBTServiceRequest(decode(built))).toThrow(CommandPayloadError)
  })
})

describe('buildBMBTServiceRequest', () => {
  it('builds the ident request bytes Wilhelm shows', () => {
    const msg = buildBMBTServiceRequest({ property: BMBT_SERVICE_PROPERTY.IDENT_REQUEST })
    expect(Array.from(encode(msg))).toEqual([0x3b, 0x04, 0xf0, 0x05, 0x00, 0xca])
  })

  it('builds a brightness-set frame', () => {
    const msg = buildBMBTServiceRequest({
      property: BMBT_SERVICE_PROPERTY.BRIGHTNESS_SET_BMBT,
      data: [0x01, 0x6c],
    })
    expect(Array.from(encode(msg))).toEqual([0x3b, 0x06, 0xf0, 0x05, 0x41, 0x01, 0x6c, 0xe4])
  })

  it('round-trips with parse', () => {
    const args = { property: 0x42, data: [0x01, 0xff] }
    const msg = decode(encode(buildBMBTServiceRequest(args)))
    const parsed = parseBMBTServiceRequest(msg)
    expect(parsed.property).toBe(0x42)
    expect(Array.from(parsed.data)).toEqual([0x01, 0xff])
  })

  it('rejects out-of-range property and data bytes', () => {
    expect(() => buildBMBTServiceRequest({ property: 256 })).toThrow(CommandPayloadError)
    expect(() => buildBMBTServiceRequest({ property: 0x00, data: [256] })).toThrow(
      CommandPayloadError,
    )
  })
})
