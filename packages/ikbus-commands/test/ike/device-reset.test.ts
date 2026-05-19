import { decode, encode } from '@emdzej/ikbus-protocol'
import { describe, expect, it } from 'vitest'
import { CommandPayloadError } from '../../src/errors.js'
import { buildIKEDeviceReset, parseIKEDeviceReset } from '../../src/ike/device-reset.js'

describe('0x1C Device Reset (navcoder authority)', () => {
  it('recognises the canonical [0x1C, 0x00] payload as Device Reset', () => {
    const msg = decode(encode(buildIKEDeviceReset()))
    const r = parseIKEDeviceReset(msg)
    expect(r.subkind).toBe('device-reset')
    expect(Array.from(r.data)).toEqual([0x00])
  })

  it('returns "unknown" for non-canonical payloads', () => {
    const msg = decode(encode(buildIKEDeviceReset({ data: [0x01, 0x02] })))
    const r = parseIKEDeviceReset(msg)
    expect(r.subkind).toBe('unknown')
    expect(Array.from(r.data)).toEqual([0x01, 0x02])
  })

  it('returns "unknown" for a single non-zero byte', () => {
    const msg = decode(encode(buildIKEDeviceReset({ data: [0xff] })))
    expect(parseIKEDeviceReset(msg).subkind).toBe('unknown')
  })

  it('refuses to build empty data', () => {
    expect(() => buildIKEDeviceReset({ data: [] })).toThrow(CommandPayloadError)
  })

  it('rejects out-of-range data bytes', () => {
    expect(() => buildIKEDeviceReset({ data: [256] })).toThrow(CommandPayloadError)
  })
})
