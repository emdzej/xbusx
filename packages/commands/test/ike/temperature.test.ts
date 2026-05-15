import { decode, encode } from '@emdzej/ibusx-protocol'
import { describe, expect, it } from 'vitest'
import { buildTemperature, parseTemperature } from '../../src/ike/temperature.js'

describe('parseTemperature', () => {
  it('decodes positive ambient + coolant (Wilhelm example)', () => {
    // 80 06 BF 19 17 37 00 00 — ambient 23 °C, coolant 55 °C
    const result = parseTemperature(
      decode(new Uint8Array([0x80, 0x06, 0xbf, 0x19, 0x17, 0x37, 0x00, 0x00])),
    )
    expect(result.ambientC).toBe(23)
    expect(result.coolantC).toBe(55)
  })

  it("decodes negative ambient (two's complement)", () => {
    // ambient byte 0xF1 → -15 °C
    const bytes = new Uint8Array([0x80, 0x06, 0xbf, 0x19, 0xf1, 0x10, 0x00, 0])
    bytes[bytes.length - 1] = xor(bytes.slice(0, -1))
    const result = parseTemperature(decode(bytes))
    expect(result.ambientC).toBe(-15)
    expect(result.coolantC).toBe(16)
  })
})

describe('buildTemperature', () => {
  it('round-trips positive ambient', () => {
    const built = buildTemperature({ ambientC: 24, coolantC: 90 })
    const parsed = parseTemperature(decode(encode(built)))
    expect(parsed.ambientC).toBe(24)
    expect(parsed.coolantC).toBe(90)
  })

  it('round-trips negative ambient', () => {
    const built = buildTemperature({ ambientC: -20, coolantC: 0 })
    const parsed = parseTemperature(decode(encode(built)))
    expect(parsed.ambientC).toBe(-20)
    expect(parsed.coolantC).toBe(0)
  })

  it('clamps coolant to the unsigned-byte range', () => {
    const built = buildTemperature({ ambientC: 0, coolantC: 500 })
    const parsed = parseTemperature(decode(encode(built)))
    expect(parsed.coolantC).toBe(255)
  })

  it('clamps ambient to the signed-byte range', () => {
    const built = buildTemperature({ ambientC: -200, coolantC: 0 })
    const parsed = parseTemperature(decode(encode(built)))
    expect(parsed.ambientC).toBe(-128)
  })
})

function xor(bytes: Uint8Array): number {
  let c = 0
  for (const b of bytes) c ^= b
  return c
}
