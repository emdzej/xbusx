import { decode, encode } from '@emdzej/ibusx-protocol'
import { describe, expect, it } from 'vitest'
import { CommandPayloadError } from '../../src/errors.js'
import {
  buildIKEOBCRemoteConfig,
  IKE_OBC_FUNCTION,
  IKE_OBC_REMOTE_CONFIG_SLOTS,
  parseIKEOBCRemoteConfig,
} from '../../src/ike/obc-remote-config.js'

describe('parseIKEOBCRemoteConfig', () => {
  it('decodes Wilhelm example (Distance, Limit, void×10)', () => {
    // 80 0F 3B 42 07 09 FF FF FF FF FF FF FF FF FF FF F8
    const msg = decode(
      new Uint8Array([
        0x80, 0x0f, 0x3b, 0x42, 0x07, 0x09, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
        0xff, 0xf8,
      ]),
    )
    const cfg = parseIKEOBCRemoteConfig(msg)
    expect(cfg.slots).toEqual([
      0x07, 0x09, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    ])
    expect(cfg.slots[0]).toBe(IKE_OBC_FUNCTION.DISTANCE)
    expect(cfg.slots[1]).toBe(IKE_OBC_FUNCTION.LIMIT)
  })

  it('decodes the memorise example (Aux. Timer 2, Date, Range)', () => {
    // 3B 0F 80 42 10 02 06 FF FF FF FF FF FF FF FF FF 1D
    const msg = decode(
      new Uint8Array([
        0x3b, 0x0f, 0x80, 0x42, 0x10, 0x02, 0x06, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
        0xff, 0x1d,
      ]),
    )
    const cfg = parseIKEOBCRemoteConfig(msg)
    expect(cfg.slots[0]).toBe(IKE_OBC_FUNCTION.AUX_TIMER_2)
    expect(cfg.slots[1]).toBe(IKE_OBC_FUNCTION.DATE)
    expect(cfg.slots[2]).toBe(IKE_OBC_FUNCTION.RANGE)
    expect(cfg.slots[3]).toBe(IKE_OBC_FUNCTION.VOID)
  })
})

describe('buildIKEOBCRemoteConfig', () => {
  it('pads with VOID to fill 12 slots', () => {
    const built = buildIKEOBCRemoteConfig({
      slots: [IKE_OBC_FUNCTION.DISTANCE, IKE_OBC_FUNCTION.LIMIT],
    })
    const parsed = parseIKEOBCRemoteConfig(decode(encode(built)))
    expect(parsed.slots).toHaveLength(IKE_OBC_REMOTE_CONFIG_SLOTS)
    expect(parsed.slots[2]).toBe(IKE_OBC_FUNCTION.VOID)
  })

  it('produces the Wilhelm Distance+Limit example exactly', () => {
    const msg = buildIKEOBCRemoteConfig({
      slots: [IKE_OBC_FUNCTION.DISTANCE, IKE_OBC_FUNCTION.LIMIT],
    })
    expect(Array.from(encode(msg))).toEqual([
      0x80, 0x0f, 0x3b, 0x42, 0x07, 0x09, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
      0xff, 0xf8,
    ])
  })

  it('rejects > 12 slots', () => {
    expect(() => buildIKEOBCRemoteConfig({ slots: new Array(13).fill(0x01) })).toThrow(
      CommandPayloadError,
    )
  })

  it('rejects out-of-range slot bytes', () => {
    expect(() => buildIKEOBCRemoteConfig({ slots: [256] })).toThrow(CommandPayloadError)
  })
})
