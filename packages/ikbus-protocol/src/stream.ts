import { IBUS_MAX_MSG_LENGTH, IBUS_RX_BUFFER_TIMEOUT_MS, MIN_FRAME_LENGTH } from './constants.js'
import { decode } from './framing.js'
import type { IKBusMessage } from './types.js'

export interface FrameStreamOptions {
  /**
   * Idle timeout in milliseconds after which a partial buffer is discarded.
   * Default: 71 (matches the I/K-bus link-layer convention).
   */
  readonly idleTimeoutMs?: number
}

/**
 * Stateful streaming decoder.  Feed bytes as they arrive on the wire; receive
 * fully-parsed frames.  Bad framing (invalid LEN, bad XOR) causes the parser
 * to advance and resynchronise at the next valid frame boundary — including
 * the case where a discarded byte happens to look like the start of a very
 * long speculative frame.
 *
 * Call `tickTimeout()` periodically (e.g. every 10 ms) to discard partial
 * buffers when the wire has gone idle mid-frame.
 */
export class FrameStream {
  private buffer: Uint8Array = new Uint8Array(0)
  private lastByteAt = 0
  private readonly idleTimeoutMs: number

  constructor(options: FrameStreamOptions = {}) {
    this.idleTimeoutMs = options.idleTimeoutMs ?? IBUS_RX_BUFFER_TIMEOUT_MS
  }

  /**
   * Feed received bytes.  Returns any newly-parsed frames in the order they
   * appear.  The supplied `timestamp` is used to drive idle-timeout handling.
   */
  feed(chunk: Uint8Array, timestamp: number = Date.now()): IKBusMessage[] {
    if (chunk.length === 0) return []
    this.buffer = concat(this.buffer, chunk)
    this.lastByteAt = timestamp
    return this.drain()
  }

  /**
   * If the buffer holds bytes and the last byte was received longer than
   * `idleTimeoutMs` ago, discard the partial buffer.  Returns true if a flush
   * happened.
   */
  tickTimeout(now: number = Date.now()): boolean {
    if (this.buffer.length === 0) return false
    if (now - this.lastByteAt > this.idleTimeoutMs) {
      this.buffer = new Uint8Array(0)
      return true
    }
    return false
  }

  /** Current buffered byte count — useful for tests and diagnostics. */
  get pendingByteCount(): number {
    return this.buffer.length
  }

  /** Discard any buffered bytes. */
  reset(): void {
    this.buffer = new Uint8Array(0)
    this.lastByteAt = 0
  }

  private drain(): IKBusMessage[] {
    const frames: IKBusMessage[] = []
    let scan = 0

    while (scan + MIN_FRAME_LENGTH <= this.buffer.length) {
      const lengthField = this.buffer[scan + 1]!
      if (lengthField < 3 || lengthField + 2 > IBUS_MAX_MSG_LENGTH) {
        scan++
        continue
      }
      const expectedTotal = lengthField + 2
      if (scan + expectedTotal > this.buffer.length) {
        // The speculative frame at `scan` can't be completed with what we
        // have.  Scan ahead — if a later offset already holds a complete,
        // valid frame, prefer it and discard the leading bytes (they were
        // either bad-frame remnants or garbage).  Otherwise wait.
        const recovered = this.findValidFrameFrom(scan + 1)
        if (recovered !== null) {
          frames.push(recovered.message)
          scan = recovered.end
          continue
        }
        break
      }
      try {
        frames.push(decode(this.buffer.slice(scan, scan + expectedTotal)))
        scan += expectedTotal
      } catch {
        scan++
      }
    }

    this.buffer = this.buffer.slice(scan)
    return frames
  }

  private findValidFrameFrom(start: number): { message: IKBusMessage; end: number } | null {
    let s = start
    while (s + MIN_FRAME_LENGTH <= this.buffer.length) {
      const lengthField = this.buffer[s + 1]!
      if (lengthField < 3 || lengthField + 2 > IBUS_MAX_MSG_LENGTH) {
        s++
        continue
      }
      const expectedTotal = lengthField + 2
      if (s + expectedTotal > this.buffer.length) {
        s++
        continue
      }
      try {
        const message = decode(this.buffer.slice(s, s + expectedTotal))
        return { message, end: s + expectedTotal }
      } catch {
        s++
      }
    }
    return null
  }
}

function concat(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length + b.length)
  out.set(a, 0)
  out.set(b, a.length)
  return out
}
