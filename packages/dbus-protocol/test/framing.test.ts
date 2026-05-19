import { describe, expect, it } from 'vitest'
import { DBUS_ADDRESSES } from '../src/addresses.js'
import { DBUS_TESTER_ADDRESS } from '../src/constants.js'
import {
  DBusChecksumError,
  DBusFrameLengthMismatchError,
  DBusFrameTooSmallError,
} from '../src/errors.js'
import { decode, encode } from '../src/framing.js'

describe('encode', () => {
  it('builds the DME identification request frame from docs/protocol/dbus.md', () => {
    // 12 04 00 16 — DST=DME, LEN=4, CMD=0x00, XOR=0x12^0x04^0x00=0x16
    const frame = encode({
      destination: DBUS_ADDRESSES.DME,
      payload: new Uint8Array([0x00]),
      checksum: 0, // ignored on encode
    })
    expect(Array.from(frame)).toEqual([0x12, 0x04, 0x00, 0x16])
  })

  it('builds the negative-ACK response from docs/protocol/dbus.md', () => {
    // F1 04 FF 0A — DME → tester, single-byte status 0xFF, XOR=0xF1^0x04^0xFF=0x0A
    const frame = encode({
      destination: DBUS_TESTER_ADDRESS,
      payload: new Uint8Array([0xff]),
      checksum: 0,
    })
    expect(Array.from(frame)).toEqual([0xf1, 0x04, 0xff, 0x0a])
  })

  it('encodes the multi-byte payload correctly', () => {
    // DST=0x80 (IKE), payload = [0x0B, 0x01], LEN = 5
    // XOR = 0x80 ^ 0x05 ^ 0x0B ^ 0x01 = 0x8F
    const frame = encode({
      destination: DBUS_ADDRESSES.IKE,
      payload: new Uint8Array([0x0b, 0x01]),
      checksum: 0,
    })
    expect(Array.from(frame)).toEqual([0x80, 0x05, 0x0b, 0x01, 0x8f])
  })

  it('throws when payload is empty (resulting frame would be < 4 bytes)', () => {
    expect(() =>
      encode({
        destination: DBUS_ADDRESSES.DME,
        payload: new Uint8Array(0),
        checksum: 0,
      }),
    ).toThrow(DBusFrameTooSmallError)
  })
})

describe('decode', () => {
  it('round-trips the DME identification request', () => {
    const msg = decode(new Uint8Array([0x12, 0x04, 0x00, 0x16]))
    expect(msg.destination).toBe(0x12)
    expect(Array.from(msg.payload)).toEqual([0x00])
    expect(msg.checksum).toBe(0x16)
  })

  it('round-trips a longer frame', () => {
    const msg = decode(new Uint8Array([0x80, 0x05, 0x0b, 0x01, 0x8f]))
    expect(msg.destination).toBe(0x80)
    expect(Array.from(msg.payload)).toEqual([0x0b, 0x01])
  })

  it('throws on frames smaller than the 4-byte minimum', () => {
    expect(() => decode(new Uint8Array([0x12, 0x03, 0x16]))).toThrow(DBusFrameTooSmallError)
  })

  it('throws when LEN does not match buffer length', () => {
    // LEN says 5 but we only supplied 4 bytes
    expect(() => decode(new Uint8Array([0x12, 0x05, 0x00, 0x17]))).toThrow(
      DBusFrameLengthMismatchError,
    )
  })

  it('throws on bad XOR', () => {
    // Last byte should be 0x16; we supply 0xFF
    expect(() => decode(new Uint8Array([0x12, 0x04, 0x00, 0xff]))).toThrow(DBusChecksumError)
  })

  it('round-trips encode → decode for arbitrary payloads', () => {
    const inputs = [
      { destination: 0x12, payload: new Uint8Array([0x00]) },
      { destination: 0x14, payload: new Uint8Array([0x04]) },
      { destination: 0xf1, payload: new Uint8Array([0xa0, 0x01, 0x02, 0x03]) },
      { destination: 0xd0, payload: new Uint8Array([0x08]) },
    ]
    for (const input of inputs) {
      const encoded = encode({ ...input, checksum: 0 })
      const decoded = decode(encoded)
      expect(decoded.destination).toBe(input.destination)
      expect(Array.from(decoded.payload)).toEqual(Array.from(input.payload))
    }
  })
})
