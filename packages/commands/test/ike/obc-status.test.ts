import { decode, encode } from '@emdzej/ibusx-protocol'
import { describe, expect, it } from 'vitest'
import { buildIKEOBCStatus, parseIKEOBCStatus } from '../../src/ike/obc-status.js'

describe('parseIKEOBCStatus', () => {
  it('decodes Wilhelm Memo:On example (80 05 E7 2A 20 00 68)', () => {
    const msg = decode(new Uint8Array([0x80, 0x05, 0xe7, 0x2a, 0x20, 0x00, 0x68]))
    const s = parseIKEOBCStatus(msg)
    expect(s.memo).toBe(true)
    expect(s.timer).toBe(false)
    expect(s.limit).toBe(false)
    expect(s.code).toBe(false)
    expect(s.auxHeating).toBe(false)
    expect(s.rawByte1).toBe(0x20)
    expect(s.rawByte2).toBe(0x00)
  })

  it('decodes Wilhelm Aux Heating example (80 05 E7 2A 00 20 68)', () => {
    const msg = decode(new Uint8Array([0x80, 0x05, 0xe7, 0x2a, 0x00, 0x20, 0x68]))
    const s = parseIKEOBCStatus(msg)
    expect(s.memo).toBe(false)
    expect(s.auxHeating).toBe(true)
    expect(s.auxVentilation).toBe(false)
  })

  it('decodes Wilhelm Code:Locked example (80 05 E7 2A 00 40 08)', () => {
    const msg = decode(new Uint8Array([0x80, 0x05, 0xe7, 0x2a, 0x00, 0x40, 0x08]))
    expect(parseIKEOBCStatus(msg).code).toBe(true)
  })

  it('decodes Wilhelm Aux Timer 1 example (80 05 E7 2A 00 04 4C)', () => {
    const msg = decode(new Uint8Array([0x80, 0x05, 0xe7, 0x2a, 0x00, 0x04, 0x4c]))
    expect(parseIKEOBCStatus(msg).auxTimer1).toBe(true)
  })
})

describe('buildIKEOBCStatus', () => {
  it('round-trips a combination of flags', () => {
    const built = buildIKEOBCStatus({ memo: true, code: true, auxHeating: true })
    const parsed = parseIKEOBCStatus(decode(encode(built)))
    expect(parsed.memo).toBe(true)
    expect(parsed.code).toBe(true)
    expect(parsed.auxHeating).toBe(true)
    expect(parsed.timer).toBe(false)
  })

  it('produces the Wilhelm example bytes for Memo:On', () => {
    const msg = buildIKEOBCStatus({ memo: true })
    expect(Array.from(encode(msg))).toEqual([0x80, 0x05, 0xe7, 0x2a, 0x20, 0x00, 0x68])
  })
})
