import { decode, encode } from '@emdzej/ikbus-protocol'
import { describe, expect, it } from 'vitest'
import { CommandPayloadError } from '../../src/errors.js'
import {
  buildIKERedundantData,
  buildIKERedundantDataRequest,
  parseIKERedundantData,
} from '../../src/ike/redundant-data.js'

describe('IKE redundant data', () => {
  it('builds the no-arg request frame', () => {
    // Wilhelm: 80 03 D0 53 00
    const msg = buildIKERedundantDataRequest({})
    expect(Array.from(encode(msg))).toEqual([0x80, 0x03, 0xd0, 0x53, 0x00])
  })

  it('decodes the Wilhelm response example (AB12345, 243,800 km)', () => {
    // D0 10 80 54 41 42 12 34 50 09 86 40 46 00 00 04 03 EF
    const msg = decode(
      new Uint8Array([
        0xd0, 0x10, 0x80, 0x54, 0x41, 0x42, 0x12, 0x34, 0x50, 0x09, 0x86, 0x40, 0x46, 0x00, 0x00,
        0x04, 0x03, 0xef,
      ]),
    )
    const r = parseIKERedundantData(msg)
    expect(r.vin).toBe('AB12345')
    expect(r.mileageKm).toBe(243800)
    expect(r.tbcRaw).toBe(0x40)
    expect(r.fuelLitres).toBe(700)
    expect(r.oilRaw).toBe(0)
    expect(r.timeDays).toBe(1027)
  })

  it('round-trips a typical state', () => {
    const args = {
      vin: 'XY98765',
      mileageKm: 100000,
      tbcRaw: 0x40,
      fuelLitres: 320,
      oilRaw: 1234,
      timeDays: 365,
    }
    const built = buildIKERedundantData(args)
    expect(parseIKERedundantData(decode(encode(built)))).toEqual(args)
  })

  it('rejects an invalid VIN', () => {
    expect(() =>
      buildIKERedundantData({
        vin: 'AB1234X',
        mileageKm: 0,
        fuelLitres: 0,
        oilRaw: 0,
        timeDays: 0,
      }),
    ).toThrow(CommandPayloadError)
  })
})
