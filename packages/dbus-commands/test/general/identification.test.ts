import { DBUS_ADDRESSES, decode } from '@emdzej/dbus-protocol'
import { describe, expect, it } from 'vitest'
import {
  buildReadIdentificationRequest,
  CMD_READ_IDENTIFICATION,
  parseECUIdentification,
} from '../../src/general/identification.js'

describe('buildReadIdentificationRequest', () => {
  it('produces the DME identification frame from docs/protocol/dbus.md', () => {
    const frame = buildReadIdentificationRequest({ destination: DBUS_ADDRESSES.DME })
    expect(Array.from(frame)).toEqual([0x12, 0x04, 0x00, 0x16])
  })

  it('round-trips: decode reveals the original destination and CMD byte', () => {
    const frame = buildReadIdentificationRequest({ destination: DBUS_ADDRESSES.EGS })
    const msg = decode(frame)
    expect(msg.destination).toBe(DBUS_ADDRESSES.EGS)
    expect(msg.payload[0]).toBe(CMD_READ_IDENTIFICATION)
  })
})

describe('parseECUIdentification', () => {
  it('returns the bytes following the 0xA0 marker', () => {
    const ident = parseECUIdentification({
      destination: 0xf1,
      payload: new Uint8Array([0xa0, 0x4d, 0x4d, 0x33, 0x35, 0x37]), // MM357
      checksum: 0,
    })
    expect(Array.from(ident.data)).toEqual([0x4d, 0x4d, 0x33, 0x35, 0x37])
  })

  it('throws when the response is not a positive ACK', () => {
    expect(() =>
      parseECUIdentification({
        destination: 0xf1,
        payload: new Uint8Array([0xff]),
        checksum: 0,
      }),
    ).toThrow(/Expected positive ACK/)
  })
})
