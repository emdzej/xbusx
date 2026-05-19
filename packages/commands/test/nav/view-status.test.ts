import { decode, encode } from '@emdzej/ibusx-protocol'
import { describe, expect, it } from 'vitest'
import { buildNAVViewStatus, parseNAVViewStatus } from '../../src/nav/view-status.js'

describe('NAV View Status 0xAB', () => {
  it('decodes Wilhelm focused example (7F 04 43 AB 01 92)', () => {
    const msg = decode(new Uint8Array([0x7f, 0x04, 0x43, 0xab, 0x01, 0x92]))
    const s = parseNAVViewStatus(msg)
    expect(s.unknownFlag).toBe(true)
    expect(s.navNotFocused).toBe(false)
  })

  it('decodes Wilhelm switched-to-radio example (7F 04 43 AB 20 B3)', () => {
    const msg = decode(new Uint8Array([0x7f, 0x04, 0x43, 0xab, 0x20, 0xb3]))
    const s = parseNAVViewStatus(msg)
    expect(s.navNotFocused).toBe(true)
    expect(s.unknownFlag).toBe(false)
  })

  it('round-trips both flags', () => {
    const msg = buildNAVViewStatus({ unknownFlag: true, navNotFocused: true })
    const p = parseNAVViewStatus(decode(encode(msg)))
    expect(p.unknownFlag).toBe(true)
    expect(p.navNotFocused).toBe(true)
  })
})
