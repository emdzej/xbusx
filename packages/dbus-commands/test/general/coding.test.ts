import { DBUS_ADDRESSES, decode } from '@emdzej/dbus-protocol'
import { describe, expect, it } from 'vitest'
import {
  buildReadCodingChecksumRequest,
  buildReadCodingRequest,
  CMD_READ_CODING,
  CMD_READ_CODING_CHECKSUM,
  parseCodingResponse,
} from '../../src/general/coding.js'

describe('buildReadCodingRequest', () => {
  it('produces the DME read-coding frame', () => {
    const frame = buildReadCodingRequest({ destination: DBUS_ADDRESSES.DME })
    // 0x12 XOR 0x04 XOR 0x08 = 0x1E
    expect(Array.from(frame)).toEqual([0x12, 0x04, 0x08, 0x1e])
  })

  it('round-trips through decode', () => {
    const frame = buildReadCodingRequest({ destination: DBUS_ADDRESSES.EGS })
    const msg = decode(frame)
    expect(msg.destination).toBe(DBUS_ADDRESSES.EGS)
    expect(msg.payload[0]).toBe(CMD_READ_CODING)
  })
})

describe('buildReadCodingChecksumRequest', () => {
  it('uses 0x0A (read coding checksum)', () => {
    const frame = buildReadCodingChecksumRequest({ destination: DBUS_ADDRESSES.LCM })
    const msg = decode(frame)
    expect(msg.payload[0]).toBe(CMD_READ_CODING_CHECKSUM)
  })
})

describe('parseCodingResponse', () => {
  it('returns the coding bytes following the 0xA0 marker', () => {
    const result = parseCodingResponse({
      destination: 0xf1,
      payload: new Uint8Array([0xa0, 0xde, 0xad, 0xbe, 0xef, 0x01, 0x02]),
      checksum: 0,
    })
    expect(Array.from(result.data)).toEqual([0xde, 0xad, 0xbe, 0xef, 0x01, 0x02])
  })

  it('throws on a coding-error response (0xB2)', () => {
    expect(() =>
      parseCodingResponse({
        destination: 0xf1,
        payload: new Uint8Array([0xb2]),
        checksum: 0,
      }),
    ).toThrow(/Expected positive ACK/)
  })
})
