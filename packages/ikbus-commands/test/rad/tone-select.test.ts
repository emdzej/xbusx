import { decode, encode } from '@emdzej/ibusx-protocol'
import { describe, expect, it } from 'vitest'
import {
  buildRADToneSelect,
  parseRADToneSelect,
  RAD_TONE_SELECT_FUNCTION,
} from '../../src/rad/tone-select.js'

describe('RAD Tone/Select 0x37', () => {
  it('decodes Wilhelm short example with TONE function (68 04 3B 37 C0 A0)', () => {
    const msg = decode(new Uint8Array([0x68, 0x04, 0x3b, 0x37, 0xc0, 0xa0]))
    const t = parseRADToneSelect(msg)
    expect(t.function).toBe(RAD_TONE_SELECT_FUNCTION.TONE)
    expect(t.controlByte).toBe(0xc0)
    expect(t.extra).toHaveLength(0)
  })

  it('decodes Wilhelm extended TONE_SET (68 07 3B 37 82 19 15 0E E3)', () => {
    const msg = decode(new Uint8Array([0x68, 0x07, 0x3b, 0x37, 0x82, 0x19, 0x15, 0x0e, 0xe3]))
    const t = parseRADToneSelect(msg)
    expect(t.function).toBe(RAD_TONE_SELECT_FUNCTION.TONE_SET)
    expect(Array.from(t.extra)).toEqual([0x19, 0x15, 0x0e])
  })

  it('decodes Wilhelm SELECT_NG example (68 04 3B 37 14 74)', () => {
    const msg = decode(new Uint8Array([0x68, 0x04, 0x3b, 0x37, 0x14, 0x74]))
    expect(parseRADToneSelect(msg).function).toBe(RAD_TONE_SELECT_FUNCTION.SELECT_NG)
  })

  it('round-trips with extra bytes', () => {
    const msg = buildRADToneSelect({ controlByte: 0x82, extra: [0x10, 0x10, 0x00] })
    const p = parseRADToneSelect(decode(encode(msg)))
    expect(p.function).toBe(RAD_TONE_SELECT_FUNCTION.TONE_SET)
    expect(Array.from(p.extra)).toEqual([0x10, 0x10, 0x00])
  })
})
