import { decode, encode } from '@emdzej/ibusx-protocol'
import { describe, expect, it } from 'vitest'
import { buildRADEqUpdate, parseRADEqUpdate, RAD_EQ_PROPERTY } from '../../src/rad/eq.js'

describe('RAD EQ 0x36', () => {
  it('decodes Wilhelm balance +0 example (68 04 3B 36 40 21)', () => {
    const msg = decode(new Uint8Array([0x68, 0x04, 0x3b, 0x36, 0x40, 0x21]))
    const u = parseRADEqUpdate(msg)
    expect(u.property).toBe(RAD_EQ_PROPERTY.BALANCE)
    expect(u.rawValue).toBe(0)
    expect(u.magnitude).toBe(0)
    expect(u.sign).toBe('positive')
  })

  it('decodes Wilhelm bass +5 (68 04 3B 36 6A 0B)', () => {
    const msg = decode(new Uint8Array([0x68, 0x04, 0x3b, 0x36, 0x6a, 0x0b]))
    const u = parseRADEqUpdate(msg)
    expect(u.property).toBe(RAD_EQ_PROPERTY.BASS)
    expect(u.rawValue).toBe(0x0a)
    expect(u.sign).toBe('positive')
  })

  it('decodes Wilhelm treble +1 (68 04 3B 36 C2 A3)', () => {
    const msg = decode(new Uint8Array([0x68, 0x04, 0x3b, 0x36, 0xc2, 0xa3]))
    const u = parseRADEqUpdate(msg)
    expect(u.property).toBe(RAD_EQ_PROPERTY.TREBLE)
    expect(u.rawValue).toBe(0x02)
  })

  it('round-trips a build with raw value', () => {
    const msg = buildRADEqUpdate({ property: RAD_EQ_PROPERTY.FADER, rawValue: 0x18 })
    const p = parseRADEqUpdate(decode(encode(msg)))
    expect(p.property).toBe(RAD_EQ_PROPERTY.FADER)
    expect(p.rawValue).toBe(0x18)
  })
})
