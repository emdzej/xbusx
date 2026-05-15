import { DEVICE_ADDRESSES, decode, encode } from '@emdzej/ibusx-protocol'
import { describe, expect, it } from 'vitest'
import { CommandMismatchError, CommandPayloadError } from '../../src/errors.js'
import {
  buildIgnitionRequest,
  buildIgnitionStatus,
  parseIgnitionStatus,
} from '../../src/ike/ignition.js'

describe('parseIgnitionStatus', () => {
  it('parses each documented ignition state', () => {
    expect(parseIgnitionStatus(decode(new Uint8Array([0x80, 0x04, 0xbf, 0x11, 0x00, 0x2a])))).toBe(
      'OFF',
    )
    expect(parseIgnitionStatus(decode(new Uint8Array([0x80, 0x04, 0xbf, 0x11, 0x01, 0x2b])))).toBe(
      'KL_R',
    )
    expect(parseIgnitionStatus(decode(new Uint8Array([0x80, 0x04, 0xbf, 0x11, 0x03, 0x29])))).toBe(
      'KL_15',
    )
    expect(parseIgnitionStatus(decode(new Uint8Array([0x80, 0x04, 0xbf, 0x11, 0x07, 0x2d])))).toBe(
      'KL_50',
    )
  })

  it('throws CommandMismatchError on the wrong command byte', () => {
    const wrong = decode(new Uint8Array([0x80, 0x04, 0xbf, 0x12, 0x00, 0x29]))
    expect(() => parseIgnitionStatus(wrong)).toThrow(CommandMismatchError)
  })

  it('throws CommandPayloadError on unknown state byte', () => {
    const unknown = decode(new Uint8Array([0x80, 0x04, 0xbf, 0x11, 0x05, 0x2f]))
    expect(() => parseIgnitionStatus(unknown)).toThrow(CommandPayloadError)
  })

  it('throws CommandPayloadError when the payload length is wrong', () => {
    const tooShort = {
      source: 0x80,
      destination: 0xbf,
      payload: new Uint8Array([0x11]),
      checksum: 0,
    }
    expect(() => parseIgnitionStatus(tooShort)).toThrow(CommandPayloadError)
  })
})

describe('buildIgnitionStatus', () => {
  it('defaults source to IKE and destination to GLO', () => {
    const msg = buildIgnitionStatus({ state: 'KL_15' })
    expect(msg.source).toBe(DEVICE_ADDRESSES.IKE)
    expect(msg.destination).toBe(DEVICE_ADDRESSES.GLO)
    expect(Array.from(msg.payload)).toEqual([0x11, 0x03])
  })

  it('round-trips through encode/decode/parse for every state', () => {
    for (const state of ['OFF', 'KL_R', 'KL_15', 'KL_50'] as const) {
      const built = buildIgnitionStatus({ state })
      const bytes = encode(built)
      const parsed = parseIgnitionStatus(decode(bytes))
      expect(parsed).toBe(state)
    }
  })

  it('produces the exact wire bytes documented in docs/devices/ike.md', () => {
    expect(Array.from(encode(buildIgnitionStatus({ state: 'OFF' })))).toEqual([
      0x80, 0x04, 0xbf, 0x11, 0x00, 0x2a,
    ])
    expect(Array.from(encode(buildIgnitionStatus({ state: 'KL_15' })))).toEqual([
      0x80, 0x04, 0xbf, 0x11, 0x03, 0x29,
    ])
  })
})

describe('buildIgnitionRequest', () => {
  it('defaults destination to IKE', () => {
    const msg = buildIgnitionRequest({ source: DEVICE_ADDRESSES.RAD })
    expect(msg.source).toBe(DEVICE_ADDRESSES.RAD)
    expect(msg.destination).toBe(DEVICE_ADDRESSES.IKE)
    expect(Array.from(msg.payload)).toEqual([0x10])
  })
})
