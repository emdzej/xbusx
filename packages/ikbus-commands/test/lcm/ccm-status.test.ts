import { decode, encode } from '@emdzej/ikbus-protocol'
import { describe, expect, it } from 'vitest'
import { buildCCMStatus, parseCCMStatus } from '../../src/lcm/ccm-status.js'

describe('CCM Status 0x51', () => {
  it('decodes Wilhelm brake-fluid example (30 04 BF 51 01 DB)', () => {
    const msg = decode(new Uint8Array([0x30, 0x04, 0xbf, 0x51, 0x01, 0xdb]))
    expect(parseCCMStatus(msg).brakeFluidLow).toBe(true)
  })

  it('decodes Wilhelm fasten-seatbelt example (30 04 BF 51 02 D8)', () => {
    const msg = decode(new Uint8Array([0x30, 0x04, 0xbf, 0x51, 0x02, 0xd8]))
    expect(parseCCMStatus(msg).fastenSeatbelt).toBe(true)
  })

  it('decodes Wilhelm oil-level example (Wilhelm shows checksum FA — actual XOR is 9A)', () => {
    // Wilhelm `lcm/51.md` lists `30 04 BF 51 40 FA`; the XOR of the
    // preceding bytes is 0x9A.  Wilhelm's example has a checksum typo.
    const msg = decode(new Uint8Array([0x30, 0x04, 0xbf, 0x51, 0x40, 0x9a]))
    expect(parseCCMStatus(msg).oilLevel).toBe(true)
  })

  it('decodes Wilhelm washer-fluid example (30 04 BF 51 10 CA)', () => {
    const msg = decode(new Uint8Array([0x30, 0x04, 0xbf, 0x51, 0x10, 0xca]))
    expect(parseCCMStatus(msg).washerFluidLow).toBe(true)
  })

  it('round-trips combined flags', () => {
    const msg = buildCCMStatus({ brakeFluidLow: true, oilLevel: true })
    const p = parseCCMStatus(decode(encode(msg)))
    expect(p.brakeFluidLow).toBe(true)
    expect(p.oilLevel).toBe(true)
    expect(p.fastenSeatbelt).toBe(false)
  })
})
