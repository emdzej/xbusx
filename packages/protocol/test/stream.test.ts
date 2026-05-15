import { describe, expect, it } from 'vitest'
import { FrameStream } from '../src/stream.js'

describe('FrameStream', () => {
  it('decodes a whole frame from one feed', () => {
    const stream = new FrameStream()
    const frames = stream.feed(new Uint8Array([0x80, 0x04, 0xbf, 0x11, 0x00, 0x2a]))
    expect(frames).toHaveLength(1)
    expect(frames[0]!.source).toBe(0x80)
  })

  it('handles a frame split across multiple feeds', () => {
    const stream = new FrameStream()
    expect(stream.feed(new Uint8Array([0x80, 0x04]))).toHaveLength(0)
    expect(stream.feed(new Uint8Array([0xbf, 0x11]))).toHaveLength(0)
    const frames = stream.feed(new Uint8Array([0x00, 0x2a]))
    expect(frames).toHaveLength(1)
    expect(frames[0]!.source).toBe(0x80)
  })

  it('decodes back-to-back frames', () => {
    const stream = new FrameStream()
    const data = new Uint8Array([
      0x80, 0x04, 0xbf, 0x11, 0x00, 0x2a, 0x80, 0x04, 0xbf, 0x11, 0x03, 0x29,
    ])
    const frames = stream.feed(data)
    expect(frames).toHaveLength(2)
    expect(frames[0]!.payload[1]).toBe(0x00)
    expect(frames[1]!.payload[1]).toBe(0x03)
  })

  it('resyncs after garbage prefix bytes', () => {
    const stream = new FrameStream()
    const data = new Uint8Array([0xff, 0xee, 0xdd, 0x80, 0x04, 0xbf, 0x11, 0x00, 0x2a])
    const frames = stream.feed(data)
    expect(frames).toHaveLength(1)
    expect(frames[0]!.source).toBe(0x80)
  })

  it('skips a frame with bad checksum and recovers at the next valid one', () => {
    const stream = new FrameStream()
    const data = new Uint8Array([
      0x80, 0x04, 0xbf, 0x11, 0x00, 0xff, 0x80, 0x04, 0xbf, 0x11, 0x03, 0x29,
    ])
    const frames = stream.feed(data)
    expect(frames).toHaveLength(1)
    expect(frames[0]!.payload[1]).toBe(0x03)
  })

  it('rejects frames whose LEN implies oversize during streaming', () => {
    const stream = new FrameStream()
    // 0xff LEN would imply a 257-byte frame — must slide and resync.
    const data = new Uint8Array([0x80, 0xff, 0x80, 0x04, 0xbf, 0x11, 0x00, 0x2a])
    const frames = stream.feed(data)
    expect(frames).toHaveLength(1)
  })

  it('flushes the buffer after idle timeout', () => {
    const stream = new FrameStream({ idleTimeoutMs: 71 })
    stream.feed(new Uint8Array([0x80, 0x04, 0xbf]), 1000)
    expect(stream.pendingByteCount).toBe(3)
    expect(stream.tickTimeout(1072)).toBe(true)
    expect(stream.pendingByteCount).toBe(0)
  })

  it('does not flush before the idle timeout', () => {
    const stream = new FrameStream({ idleTimeoutMs: 71 })
    stream.feed(new Uint8Array([0x80, 0x04, 0xbf]), 1000)
    expect(stream.tickTimeout(1050)).toBe(false)
    expect(stream.pendingByteCount).toBe(3)
  })

  it('reset clears the buffer', () => {
    const stream = new FrameStream()
    stream.feed(new Uint8Array([0x80, 0x04]))
    expect(stream.pendingByteCount).toBe(2)
    stream.reset()
    expect(stream.pendingByteCount).toBe(0)
  })
})
