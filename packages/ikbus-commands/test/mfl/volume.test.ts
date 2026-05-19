import { DEVICE_ADDRESSES, decode, encode } from '@emdzej/ibusx-protocol'
import { describe, expect, it } from 'vitest'
import { CommandPayloadError } from '../../src/errors.js'
import { buildVolume, parseVolume } from '../../src/mfl/volume.js'

describe('parseVolume', () => {
  it('decodes Wilhelm example: MFL → RAD volume down (1 step)', () => {
    // 50 04 68 32 10 1E
    expect(parseVolume(decode(new Uint8Array([0x50, 0x04, 0x68, 0x32, 0x10, 0x1e])))).toEqual({
      direction: 'DOWN',
      steps: 1,
    })
  })

  it('decodes volume up', () => {
    expect(parseVolume(decode(new Uint8Array([0x50, 0x04, 0x68, 0x32, 0x11, 0x1f])))).toEqual({
      direction: 'UP',
      steps: 1,
    })
  })

  it('decodes multi-step volume change', () => {
    // BMBT-style 5 steps up
    const msg = buildVolume({ direction: 'UP', steps: 5 })
    expect(parseVolume(decode(encode(msg)))).toEqual({ direction: 'UP', steps: 5 })
  })
})

describe('buildVolume', () => {
  it('defaults source to MFL, destination to RAD, steps to 1', () => {
    const msg = buildVolume({ direction: 'UP' })
    expect(msg.source).toBe(DEVICE_ADDRESSES.MFL)
    expect(msg.destination).toBe(DEVICE_ADDRESSES.RAD)
    expect(Array.from(msg.payload)).toEqual([0x32, 0x11])
  })

  it('round-trips every direction × step combination', () => {
    for (const direction of ['UP', 'DOWN'] as const) {
      for (let steps = 1; steps <= 15; steps++) {
        const parsed = parseVolume(decode(encode(buildVolume({ direction, steps }))))
        expect(parsed).toEqual({ direction, steps })
      }
    }
  })

  it('throws on out-of-range steps', () => {
    expect(() => buildVolume({ direction: 'UP', steps: 0 })).toThrow(CommandPayloadError)
    expect(() => buildVolume({ direction: 'UP', steps: 16 })).toThrow(CommandPayloadError)
  })
})
