import { describe, expect, it } from 'vitest'
import { computeChecksum, verifyChecksum } from '../src/checksum.js'

describe('computeChecksum', () => {
  it('returns 0 for empty input', () => {
    expect(computeChecksum(new Uint8Array(0))).toBe(0)
  })

  it('XORs all bytes when no end is given', () => {
    expect(computeChecksum(new Uint8Array([0x12, 0x04, 0x00]))).toBe(0x16)
  })

  it('respects the `end` boundary', () => {
    const bytes = new Uint8Array([0x12, 0x04, 0x00, 0x16, 0xff])
    expect(computeChecksum(bytes, 3)).toBe(0x16)
  })
})

describe('verifyChecksum', () => {
  it('returns true when the last byte is the XOR of the rest', () => {
    expect(verifyChecksum(new Uint8Array([0x12, 0x04, 0x00, 0x16]))).toBe(true)
  })

  it('returns false when the last byte is wrong', () => {
    expect(verifyChecksum(new Uint8Array([0x12, 0x04, 0x00, 0xff]))).toBe(false)
  })

  it('returns false for buffers shorter than 2 bytes', () => {
    expect(verifyChecksum(new Uint8Array(0))).toBe(false)
    expect(verifyChecksum(new Uint8Array([0x12]))).toBe(false)
  })
})
