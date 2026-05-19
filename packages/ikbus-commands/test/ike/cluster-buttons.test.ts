import { decode, encode } from '@emdzej/ikbus-protocol'
import { describe, expect, it } from 'vitest'
import { buildIKEClusterButton, parseIKEClusterButton } from '../../src/ike/cluster-buttons.js'

describe('IKE cluster buttons 0x57', () => {
  it('decodes Wilhelm CHECK press (80 04 FF 57 01 2D)', () => {
    const msg = decode(new Uint8Array([0x80, 0x04, 0xff, 0x57, 0x01, 0x2d]))
    expect(parseIKEClusterButton(msg)).toEqual({
      button: 'CHECK',
      rawButtonValue: 0x01,
      state: 'press',
      rawByte: 0x01,
    })
  })

  it('decodes Wilhelm CHECK release (80 04 FF 57 41 6D)', () => {
    const msg = decode(new Uint8Array([0x80, 0x04, 0xff, 0x57, 0x41, 0x6d]))
    const b = parseIKEClusterButton(msg)
    expect(b.button).toBe('CHECK')
    expect(b.state).toBe('release')
  })

  it('decodes Wilhelm BC press (80 04 FF 57 02 2E)', () => {
    const msg = decode(new Uint8Array([0x80, 0x04, 0xff, 0x57, 0x02, 0x2e]))
    expect(parseIKEClusterButton(msg).button).toBe('STALK_BC')
  })

  it('round-trips builder/parser', () => {
    const built = buildIKEClusterButton({ button: 'CHECK', state: 'release' })
    expect(parseIKEClusterButton(decode(encode(built)))).toMatchObject({
      button: 'CHECK',
      state: 'release',
    })
  })
})
