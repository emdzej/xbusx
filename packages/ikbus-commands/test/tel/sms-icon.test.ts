import { decode, encode } from '@emdzej/ibusx-protocol'
import { describe, expect, it } from 'vitest'
import { buildTELSMSIcon, parseTELSMSIcon } from '../../src/tel/sms-icon.js'

describe('parseTELSMSIcon', () => {
  it('decodes Wilhelm show example (C8 05 E7 A6 00 01 8D)', () => {
    const msg = decode(new Uint8Array([0xc8, 0x05, 0xe7, 0xa6, 0x00, 0x01, 0x8d]))
    expect(parseTELSMSIcon(msg)).toEqual({ visible: true, reserved: 0x00 })
  })

  it('decodes Wilhelm hide example (C8 05 E7 A6 00 00 8C)', () => {
    // Wilhelm shows checksum 8D for both, but XOR for hide is 0xC8^0x05^0xE7^0xA6^0x00^0x00 = 0x8C
    const msg = decode(new Uint8Array([0xc8, 0x05, 0xe7, 0xa6, 0x00, 0x00, 0x8c]))
    expect(parseTELSMSIcon(msg)).toEqual({ visible: false, reserved: 0x00 })
  })
})

describe('buildTELSMSIcon', () => {
  it('round-trips show/hide', () => {
    expect(parseTELSMSIcon(decode(encode(buildTELSMSIcon({ visible: true })))).visible).toBe(true)
    expect(parseTELSMSIcon(decode(encode(buildTELSMSIcon({ visible: false })))).visible).toBe(false)
  })
})
