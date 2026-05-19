import { decode, encode } from '@emdzej/ibusx-protocol'
import { describe, expect, it } from 'vitest'
import {
  buildBMBTServiceReply,
  parseBMBTBrightnessReply,
  parseBMBTIdentReply,
  parseBMBTKeyFunctionReply,
  parseBMBTServiceReply,
} from '../../src/bmbt/service-mode-reply.js'
import { CommandPayloadError } from '../../src/errors.js'

describe('parseBMBTServiceReply (raw)', () => {
  it('decodes Wilhelm brightness reply (F0 04 3B 06 18 D1)', () => {
    const msg = decode(new Uint8Array([0xf0, 0x04, 0x3b, 0x06, 0x18, 0xd1]))
    expect(Array.from(parseBMBTServiceReply(msg).data)).toEqual([0x18])
  })

  it('requires at least one data byte', () => {
    // 0x06 alone with no data — fails min-length
    const built = encode({
      source: 0xf0,
      destination: 0x3b,
      payload: new Uint8Array([0x06]),
      checksum: 0,
    })
    expect(() => parseBMBTServiceReply(decode(built))).toThrow(CommandPayloadError)
  })
})

describe('parseBMBTIdentReply', () => {
  it('decodes the Wilhelm ident example', () => {
    // F0 13 3B 06 86 91 33 87 43 00 31 10 22 01 17 42 00 00 00 00 69
    const msg = decode(
      new Uint8Array([
        0xf0, 0x13, 0x3b, 0x06, 0x86, 0x91, 0x33, 0x87, 0x43, 0x00, 0x31, 0x10, 0x22, 0x01, 0x17,
        0x42, 0x00, 0x00, 0x00, 0x00, 0x69,
      ]),
    )
    const id = parseBMBTIdentReply(msg)
    expect(Array.from(id.partNumberBytes)).toEqual([0x86, 0x91, 0x33, 0x87])
    expect(id.hwLevel).toBe(43)
    expect(id.codingIndex).toBe(0)
    expect(id.diagIndex).toBe(31)
    expect(id.busIndex).toBe(10)
    expect(id.manufactureMonthBcd).toBe(0x22) // Wilhelm shows "22 01"
    expect(id.manufactureYearBcd).toBe(0x01)
    expect(id.supplier).toBe(17)
    expect(id.swLevel).toBe(42)
    expect(Array.from(id.tail)).toEqual([0x00, 0x00, 0x00, 0x00])
  })

  it('rejects wrong payload length', () => {
    const built = encode({
      source: 0xf0,
      destination: 0x3b,
      payload: new Uint8Array([0x06, 0x12, 0x34]),
      checksum: 0,
    })
    expect(() => parseBMBTIdentReply(decode(built))).toThrow(CommandPayloadError)
  })
})

describe('parseBMBTKeyFunctionReply', () => {
  it('decodes the Wilhelm key-function init reply (F0 06 3B 06 FF 00 00 34)', () => {
    const msg = decode(new Uint8Array([0xf0, 0x06, 0x3b, 0x06, 0xff, 0x00, 0x00, 0x34]))
    expect(parseBMBTKeyFunctionReply(msg)).toEqual({
      keyByte: 0xff,
      obmSensor: 0x00,
      radioSensor: 0x00,
    })
  })
})

describe('parseBMBTBrightnessReply', () => {
  it('decodes a Wilhelm brightness step', () => {
    // F0 04 3B 06 80 49  — Wilhelm shows this as "0" (mid-slider)
    const msg = decode(new Uint8Array([0xf0, 0x04, 0x3b, 0x06, 0x80, 0x49]))
    expect(parseBMBTBrightnessReply(msg)).toEqual({ rawByte: 0x80 })
  })
})

describe('buildBMBTServiceReply', () => {
  it('builds a brightness-reply frame round-trippable to the Wilhelm example', () => {
    const msg = buildBMBTServiceReply({ data: [0x18] })
    expect(Array.from(encode(msg))).toEqual([0xf0, 0x04, 0x3b, 0x06, 0x18, 0xd1])
  })

  it('refuses empty data', () => {
    expect(() => buildBMBTServiceReply({ data: [] })).toThrow(CommandPayloadError)
  })
})
