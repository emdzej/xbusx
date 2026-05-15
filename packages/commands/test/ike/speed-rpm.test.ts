import { decode, encode } from '@emdzej/ibusx-protocol'
import { describe, expect, it } from 'vitest'
import { CommandPayloadError } from '../../src/errors.js'
import { buildSpeedRpm, parseSpeedRpm } from '../../src/ike/speed-rpm.js'

describe('parseSpeedRpm', () => {
  it('decodes speed = byte * 2 and rpm = byte * 100', () => {
    // 80 05 BF 18 1F 15 XOR  (speed = 0x1F * 2 = 62, rpm = 0x15 * 100 = 2100)
    const bytes = new Uint8Array([0x80, 0x05, 0xbf, 0x18, 0x1f, 0x15, 0])
    bytes[bytes.length - 1] = xor(bytes.slice(0, -1))
    const result = parseSpeedRpm(decode(bytes))
    expect(result.kmh).toBe(62)
    expect(result.rpm).toBe(2100)
  })

  it('decodes zero', () => {
    const bytes = new Uint8Array([0x80, 0x05, 0xbf, 0x18, 0x00, 0x00, 0])
    bytes[bytes.length - 1] = xor(bytes.slice(0, -1))
    const result = parseSpeedRpm(decode(bytes))
    expect(result.kmh).toBe(0)
    expect(result.rpm).toBe(0)
  })
})

describe('buildSpeedRpm', () => {
  it('round-trips a typical reading', () => {
    const built = buildSpeedRpm({ kmh: 80, rpm: 2500 })
    const parsed = parseSpeedRpm(decode(encode(built)))
    expect(parsed.kmh).toBe(80)
    expect(parsed.rpm).toBe(2500)
  })

  it('rounds to the wire resolution (km/h step 2, rpm step 100)', () => {
    const built = buildSpeedRpm({ kmh: 81, rpm: 2549 })
    const parsed = parseSpeedRpm(decode(encode(built)))
    // 81 → rounded to nearest 2 → 80 or 82; same for rpm
    expect([80, 82]).toContain(parsed.kmh)
    expect([2500, 2600]).toContain(parsed.rpm)
  })

  it('clamps to the maximum wire byte (255)', () => {
    const built = buildSpeedRpm({ kmh: 600, rpm: 30000 })
    const parsed = parseSpeedRpm(decode(encode(built)))
    expect(parsed.kmh).toBe(510) // 255 * 2
    expect(parsed.rpm).toBe(25500) // 255 * 100
  })

  it('throws on negative input', () => {
    expect(() => buildSpeedRpm({ kmh: -1, rpm: 0 })).toThrow(CommandPayloadError)
    expect(() => buildSpeedRpm({ kmh: 0, rpm: -1 })).toThrow(CommandPayloadError)
  })
})

function xor(bytes: Uint8Array): number {
  let c = 0
  for (const b of bytes) c ^= b
  return c
}
