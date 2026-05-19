import { decode, encode } from '@emdzej/ibusx-protocol'
import { describe, expect, it } from 'vitest'
import { CommandPayloadError } from '../../src/errors.js'
import { buildIKEReplicateData, parseIKEReplicateData } from '../../src/ike/replicate-data.js'

describe('parseIKEReplicateData', () => {
  it('decodes the Wilhelm worked example (243,500 km, 640 L, 628 days)', () => {
    // 80 0B D0 55 09 83 40 40 00 00 02 74 F2
    const msg = decode(
      new Uint8Array([
        0x80, 0x0b, 0xd0, 0x55, 0x09, 0x83, 0x40, 0x40, 0x00, 0x00, 0x02, 0x74, 0xf2,
      ]),
    )
    expect(parseIKEReplicateData(msg)).toEqual({
      mileageKm: 243500,
      tbcRaw: 0x40,
      fuelLitres: 640,
      oilRaw: 0,
      timeDays: 628,
    })
  })

  it('decodes the second Wilhelm worked example (243,600 km, 660 L, 717 days)', () => {
    // 80 0B D0 55 09 84 40 42 00 00 02 CD 4E
    const msg = decode(
      new Uint8Array([
        0x80, 0x0b, 0xd0, 0x55, 0x09, 0x84, 0x40, 0x42, 0x00, 0x00, 0x02, 0xcd, 0x4e,
      ]),
    )
    const parsed = parseIKEReplicateData(msg)
    expect(parsed.mileageKm).toBe(243600)
    expect(parsed.fuelLitres).toBe(660)
    expect(parsed.timeDays).toBe(717)
  })
})

describe('buildIKEReplicateData', () => {
  it('round-trips a typical state', () => {
    const args = {
      mileageKm: 150000,
      tbcRaw: 0x20,
      fuelLitres: 500,
      oilRaw: 1234,
      timeDays: 400,
    }
    const built = buildIKEReplicateData(args)
    expect(parseIKEReplicateData(decode(encode(built)))).toEqual(args)
  })

  it('rounds mileage to the nearest × 100 km step', () => {
    // 150,099 → mileageWord = 1501 → 150,100
    expect(
      buildIKEReplicateData({
        mileageKm: 150099,
        tbcRaw: 0,
        fuelLitres: 0,
        oilRaw: 0,
        timeDays: 0,
      }).payload.subarray(1, 3),
    ).toEqual(new Uint8Array([0x05, 0xdd])) // 1501
  })

  it('rejects out-of-range values', () => {
    const base = { tbcRaw: 0, fuelLitres: 0, oilRaw: 0, timeDays: 0 }
    expect(() => buildIKEReplicateData({ ...base, mileageKm: -100 })).toThrow(CommandPayloadError)
    expect(() => buildIKEReplicateData({ ...base, mileageKm: 0xffffff * 100 })).toThrow(
      CommandPayloadError,
    )
    expect(() => buildIKEReplicateData({ ...base, mileageKm: 0, tbcRaw: 256 })).toThrow(
      CommandPayloadError,
    )
  })
})
