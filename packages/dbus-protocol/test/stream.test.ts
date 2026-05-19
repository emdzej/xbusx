import { describe, expect, it } from 'vitest'
import { DBusFrameStream } from '../src/stream.js'

const FRAME_DME_IDENT = new Uint8Array([0x12, 0x04, 0x00, 0x16])
const FRAME_NEG_ACK = new Uint8Array([0xf1, 0x04, 0xff, 0x0a])
const FRAME_IKE_LONG = new Uint8Array([0x80, 0x05, 0x0b, 0x01, 0x8f])

describe('DBusFrameStream', () => {
  it('parses a single complete frame in one feed', () => {
    const stream = new DBusFrameStream()
    const frames = stream.feed(FRAME_DME_IDENT)
    expect(frames).toHaveLength(1)
    expect(frames[0]!.destination).toBe(0x12)
    expect(Array.from(frames[0]!.payload)).toEqual([0x00])
  })

  it('parses two back-to-back frames in one feed', () => {
    const stream = new DBusFrameStream()
    const combined = new Uint8Array(FRAME_DME_IDENT.length + FRAME_NEG_ACK.length)
    combined.set(FRAME_DME_IDENT, 0)
    combined.set(FRAME_NEG_ACK, FRAME_DME_IDENT.length)
    const frames = stream.feed(combined)
    expect(frames).toHaveLength(2)
    expect(frames[0]!.destination).toBe(0x12)
    expect(frames[1]!.destination).toBe(0xf1)
  })

  it('buffers a partial frame across feeds', () => {
    const stream = new DBusFrameStream()
    expect(stream.feed(FRAME_IKE_LONG.slice(0, 3))).toHaveLength(0)
    expect(stream.pendingByteCount).toBe(3)
    const frames = stream.feed(FRAME_IKE_LONG.slice(3))
    expect(frames).toHaveLength(1)
    expect(frames[0]!.destination).toBe(0x80)
    expect(Array.from(frames[0]!.payload)).toEqual([0x0b, 0x01])
    expect(stream.pendingByteCount).toBe(0)
  })

  it('skips garbage bytes and resynchronises on a valid frame', () => {
    const stream = new DBusFrameStream()
    const noisy = new Uint8Array([
      0xaa,
      0xbb, // junk
      ...FRAME_DME_IDENT,
      0xcc, // trailing junk
      ...FRAME_NEG_ACK,
    ])
    const frames = stream.feed(noisy)
    expect(frames).toHaveLength(2)
    expect(frames[0]!.destination).toBe(0x12)
    expect(frames[1]!.destination).toBe(0xf1)
  })

  it('discards a partial buffer after the idle timeout', () => {
    const stream = new DBusFrameStream({ idleTimeoutMs: 50 })
    stream.feed(FRAME_DME_IDENT.slice(0, 2), 1000)
    expect(stream.pendingByteCount).toBe(2)
    expect(stream.tickTimeout(1051)).toBe(true)
    expect(stream.pendingByteCount).toBe(0)
  })

  it('reset() empties the buffer', () => {
    const stream = new DBusFrameStream()
    stream.feed(FRAME_DME_IDENT.slice(0, 2))
    stream.reset()
    expect(stream.pendingByteCount).toBe(0)
  })
})
