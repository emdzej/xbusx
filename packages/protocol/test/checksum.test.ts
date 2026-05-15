import { describe, expect, it } from 'vitest'
import { computeChecksum, verifyChecksum } from '../src/checksum.js'

describe('computeChecksum', () => {
  it('computes XOR of all bytes', () => {
    const bytes = new Uint8Array([0x80, 0x04, 0xbf, 0x11, 0x00])
    // 0x80 ^ 0x04 ^ 0xbf ^ 0x11 ^ 0x00 = 0x2a
    expect(computeChecksum(bytes)).toBe(0x2a)
  })

  it('respects the end parameter', () => {
    const bytes = new Uint8Array([0x80, 0x04, 0xbf, 0x11, 0x00, 0x2a])
    expect(computeChecksum(bytes, 5)).toBe(0x2a)
  })

  it('returns 0 for an empty range', () => {
    expect(computeChecksum(new Uint8Array([0xff]), 0)).toBe(0)
  })

  it('returns 0 for an empty buffer', () => {
    expect(computeChecksum(new Uint8Array(0))).toBe(0)
  })
})

describe('verifyChecksum', () => {
  it('returns true for a valid frame', () => {
    const valid = new Uint8Array([0x80, 0x04, 0xbf, 0x11, 0x00, 0x2a])
    expect(verifyChecksum(valid)).toBe(true)
  })

  it('returns false for a corrupted frame', () => {
    const invalid = new Uint8Array([0x80, 0x04, 0xbf, 0x11, 0x00, 0x2b])
    expect(verifyChecksum(invalid)).toBe(false)
  })

  it('returns false for a too-short buffer', () => {
    expect(verifyChecksum(new Uint8Array([0x80]))).toBe(false)
  })
})
