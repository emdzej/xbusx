import { decode, encode } from '@emdzej/ikbus-protocol'
import { describe, expect, it } from 'vitest'
import {
  buildRADInputSource,
  parseRADInputSource,
  RAD_INPUT_SOURCE,
} from '../../src/rad/input-source.js'

describe('RAD Input Source 0x4E', () => {
  it('decodes Wilhelm "Set source TV" (3B 05 68 4E 01 00 19)', () => {
    const msg = decode(new Uint8Array([0x3b, 0x05, 0x68, 0x4e, 0x01, 0x00, 0x19]))
    expect(parseRADInputSource(msg)).toEqual({ source: RAD_INPUT_SOURCE.TV, reserved: 0 })
  })

  it('decodes Wilhelm "Set source radio" (3B 05 68 4E 00 00 18)', () => {
    const msg = decode(new Uint8Array([0x3b, 0x05, 0x68, 0x4e, 0x00, 0x00, 0x18]))
    expect(parseRADInputSource(msg).source).toBe(RAD_INPUT_SOURCE.RADIO)
  })

  it('round-trips builder/parser', () => {
    const msg = buildRADInputSource({ inputSource: RAD_INPUT_SOURCE.TV })
    expect(parseRADInputSource(decode(encode(msg))).source).toBe(RAD_INPUT_SOURCE.TV)
  })
})
