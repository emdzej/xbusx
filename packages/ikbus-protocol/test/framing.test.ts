import { describe, expect, it } from 'vitest'
import {
  ChecksumError,
  FrameLengthMismatchError,
  FrameTooLargeError,
  FrameTooSmallError,
} from '../src/errors.js'
import { decode, encode } from '../src/framing.js'

describe('encode', () => {
  it('encodes an IKE ignition broadcast', () => {
    const bytes = encode({
      source: 0x80,
      destination: 0xbf,
      payload: new Uint8Array([0x11, 0x00]),
      checksum: 0,
    })
    expect(Array.from(bytes)).toEqual([0x80, 0x04, 0xbf, 0x11, 0x00, 0x2a])
  })

  it('encodes a minimum-size frame (one-byte payload)', () => {
    const bytes = encode({
      source: 0x18,
      destination: 0x68,
      payload: new Uint8Array([0x39]),
      checksum: 0,
    })
    expect(bytes.length).toBe(5)
    expect(bytes[1]).toBe(0x03)
  })

  it('throws when the frame would exceed 47 bytes', () => {
    expect(() =>
      encode({
        source: 0x80,
        destination: 0xbf,
        payload: new Uint8Array(44),
        checksum: 0,
      }),
    ).toThrow(FrameTooLargeError)
  })

  it('throws when the payload is empty', () => {
    expect(() =>
      encode({
        source: 0x80,
        destination: 0xbf,
        payload: new Uint8Array(0),
        checksum: 0,
      }),
    ).toThrow(FrameTooSmallError)
  })

  it('truncates source / destination bytes to 8 bits', () => {
    const bytes = encode({
      source: 0x180,
      destination: 0x1bf,
      payload: new Uint8Array([0x11, 0x00]),
      checksum: 0,
    })
    expect(bytes[0]).toBe(0x80)
    expect(bytes[2]).toBe(0xbf)
  })
})

describe('decode', () => {
  it('parses a valid frame', () => {
    const message = decode(new Uint8Array([0x80, 0x04, 0xbf, 0x11, 0x00, 0x2a]))
    expect(message.source).toBe(0x80)
    expect(message.destination).toBe(0xbf)
    expect(Array.from(message.payload)).toEqual([0x11, 0x00])
    expect(message.checksum).toBe(0x2a)
  })

  it('throws ChecksumError on bad XOR', () => {
    expect(() => decode(new Uint8Array([0x80, 0x04, 0xbf, 0x11, 0x00, 0xff]))).toThrow(
      ChecksumError,
    )
  })

  it('throws FrameLengthMismatchError when buffer length disagrees with LEN', () => {
    // LEN says 4 (total 6) but we provide 7 bytes
    expect(() => decode(new Uint8Array([0x80, 0x04, 0xbf, 0x11, 0x00, 0x2a, 0xff]))).toThrow(
      FrameLengthMismatchError,
    )
  })

  it('throws FrameTooSmallError when the buffer is under the minimum', () => {
    expect(() => decode(new Uint8Array([0x80, 0x04]))).toThrow(FrameTooSmallError)
  })

  it('throws FrameTooLargeError when LEN implies over-long frame', () => {
    // LEN = 46 → would-be total 48 > IBUS_MAX_MSG_LENGTH
    const oversized = new Uint8Array(48)
    oversized[0] = 0x80
    oversized[1] = 46
    oversized[2] = 0xbf
    expect(() => decode(oversized)).toThrow(FrameTooLargeError)
  })

  it('round-trips encode → decode', () => {
    const original = {
      source: 0x68,
      destination: 0x18,
      payload: new Uint8Array([0x38, 0x03, 0x00]),
      checksum: 0,
    }
    const parsed = decode(encode(original))
    expect(parsed.source).toBe(original.source)
    expect(parsed.destination).toBe(original.destination)
    expect(Array.from(parsed.payload)).toEqual(Array.from(original.payload))
  })
})
