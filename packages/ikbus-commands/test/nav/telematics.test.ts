import { decode, encode } from '@emdzej/ibusx-protocol'
import { describe, expect, it } from 'vitest'
import {
  buildNAVTelematicsLocation,
  NAV_ADDRESS_TYPE,
  parseNAVTelematicsCoordinates,
  parseNAVTelematicsLocation,
} from '../../src/nav/telematics.js'

describe('NAV Telematics 0xA2 Coordinates', () => {
  it('decodes Wilhelm Melbourne example', () => {
    // 7F 14 C8 A2 01 00 37 51 21 41 01 45 02 29 70 00 46 00 00 02 12 4F
    const msg = decode(
      new Uint8Array([
        0x7f, 0x14, 0xc8, 0xa2, 0x01, 0x00, 0x37, 0x51, 0x21, 0x41, 0x01, 0x45, 0x02, 0x29, 0x70,
        0x00, 0x46, 0x00, 0x00, 0x02, 0x12, 0x4f,
      ]),
    )
    const t = parseNAVTelematicsCoordinates(msg)
    expect(t.signal).toBe(true)
    // 37°51′21.4″S
    expect(t.latitude).toBeLessThan(-37.85)
    expect(t.latitude).toBeGreaterThan(-37.86)
    // 145°02′29.7″E
    expect(t.longitude).toBeGreaterThan(145.04)
    expect(t.longitude).toBeLessThan(145.05)
    expect(t.altitudeMetres).toBe(46)
    expect(t.hour).toBe(0)
    expect(t.minute).toBe(2)
    expect(t.second).toBe(12)
  })
})

describe('NAV Telematics 0xA4 Location', () => {
  it('decodes Wilhelm Muenchen city example', () => {
    // 7F 23 C8 A4 00 01 "MUENCHEN" \0...
    const bytes = [
      0x7f, 0x23, 0xc8, 0xa4, 0x00, 0x01, 0x4d, 0x55, 0x45, 0x4e, 0x43, 0x48, 0x45, 0x4e,
    ]
    while (bytes.length < 36) bytes.push(0x00)
    // Recompute checksum
    let xor = 0
    for (const b of bytes) xor ^= b
    bytes.push(xor)
    const msg = decode(new Uint8Array(bytes))
    const loc = parseNAVTelematicsLocation(msg)
    expect(loc.addressType).toBe(NAV_ADDRESS_TYPE.CITY)
    expect(loc.address).toBe('MUENCHEN')
  })

  it('round-trips a built location', () => {
    const msg = buildNAVTelematicsLocation({
      addressType: NAV_ADDRESS_TYPE.STREET,
      address: 'PETUELRING',
    })
    const p = parseNAVTelematicsLocation(decode(encode(msg)))
    expect(p.addressType).toBe(NAV_ADDRESS_TYPE.STREET)
    expect(p.address).toBe('PETUELRING')
  })
})
