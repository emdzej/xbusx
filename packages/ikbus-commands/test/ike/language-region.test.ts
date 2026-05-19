import { decode, encode } from '@emdzej/ikbus-protocol'
import { describe, expect, it } from 'vitest'
import {
  buildIKELanguageRegion,
  buildIKELanguageRegionRequest,
  IKE_CLUSTER_TYPE,
  IKE_LANGUAGE,
  parseIKELanguageRegion,
} from '../../src/ike/language-region.js'

describe('Language & Region', () => {
  it('builds the Wilhelm request frames', () => {
    // 3B 03 80 14 AC  # GT
    const fromGT = buildIKELanguageRegionRequest({ source: 0x3b })
    expect(Array.from(encode(fromGT))).toEqual([0x3b, 0x03, 0x80, 0x14, 0xac])
    // C8 03 80 14 5F  # Telephone
    const fromTel = buildIKELanguageRegionRequest({ source: 0xc8 })
    expect(Array.from(encode(fromTel))).toEqual([0xc8, 0x03, 0x80, 0x14, 0x5f])
  })

  it('decodes a Wilhelm response example', () => {
    // 80 07 BF 15 01 85 60 42 8B
    const msg = decode(new Uint8Array([0x80, 0x07, 0xbf, 0x15, 0x01, 0x85, 0x60, 0x42, 0x8b]))
    const lr = parseIKELanguageRegion(msg)
    expect(lr.language).toBe(IKE_LANGUAGE.EN_GB) // 0x01
    expect(lr.clusterType).toBe(IKE_CLUSTER_TYPE.HIGH)
    // 0x85 = bits 7,2,0 → arrival12h + obcResumeAtKlR + time12h
    expect(lr.time12h).toBe(true)
    expect(lr.obcResumeAtKlR).toBe(true)
    expect(lr.arrival12h).toBe(true)
    expect(lr.rawByte3).toBe(0x60)
    expect(lr.rawByte4).toBe(0x42)
  })

  it('round-trips raw-bytes builder', () => {
    const built = buildIKELanguageRegion({ raw: [0x08, 0x85, 0xe0, 0x42] })
    expect(Array.from(encode(built))).toEqual([
      0x80, 0x07, 0xbf, 0x15, 0x08, 0x85, 0xe0, 0x42, 0x02,
    ])
  })

  it('builds with named flags', () => {
    const msg = buildIKELanguageRegion({
      language: IKE_LANGUAGE.EN_US,
      time12h: true,
      temperatureFahrenheit: true,
    })
    const parsed = parseIKELanguageRegion(decode(encode(msg)))
    expect(parsed.language).toBe(IKE_LANGUAGE.EN_US)
    expect(parsed.time12h).toBe(true)
    expect(parsed.temperatureFahrenheit).toBe(true)
  })
})
