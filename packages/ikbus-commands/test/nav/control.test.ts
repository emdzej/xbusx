import { decode, encode } from '@emdzej/ikbus-protocol'
import { describe, expect, it } from 'vitest'
import { buildNAVControl, NAV_MAP_SCALE, NAV_POI, parseNAVControl } from '../../src/nav/control.js'

describe('NAV Control 0xAA', () => {
  it('decodes Wilhelm GTF focus example (43 04 7F AA 00)', () => {
    const msg = decode(new Uint8Array([0x43, 0x04, 0x7f, 0xaa, 0x00, 0x92]))
    expect(Array.from(parseNAVControl(msg).data)).toEqual([0x00])
  })

  it('decodes Wilhelm map-scale 200m (B0 05 7F AA 10 02)', () => {
    const msg = decode(new Uint8Array([0xb0, 0x05, 0x7f, 0xaa, 0x10, 0x02, 0x72]))
    expect(Array.from(parseNAVControl(msg).data)).toEqual([0x10, NAV_MAP_SCALE.M_200])
  })

  it('decodes Wilhelm POI petrol-at-current (B0 05 7F AA 20 03)', () => {
    const msg = decode(new Uint8Array([0xb0, 0x05, 0x7f, 0xaa, 0x20, 0x03, 0x43]))
    expect(Array.from(parseNAVControl(msg).data)).toEqual([0x20, NAV_POI.PETROL_AT_CURRENT])
  })

  it('builds a focus-map command', () => {
    const msg = buildNAVControl({ data: [0x04, 0x00] })
    const p = parseNAVControl(decode(encode(msg)))
    expect(Array.from(p.data)).toEqual([0x04, 0x00])
  })
})
