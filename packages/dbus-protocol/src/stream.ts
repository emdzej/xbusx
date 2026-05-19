import {
  DBUS_MAX_MSG_LENGTH,
  DBUS_MIN_FRAME_LENGTH,
  DBUS_RX_BUFFER_TIMEOUT_MS,
} from './constants.js'
import { decode } from './framing.js'
import type { DBusMessage } from './types.js'

export interface DBusFrameStreamOptions {
  /**
   * Idle timeout in milliseconds after which a partial buffer is discarded.
   * Default: 71ms (mirrors the I/K-bus baseline; navcoder has no documented
   * D-bus timing constant).
   */
  readonly idleTimeoutMs?: number
}

/**
 * Stateful streaming decoder for D-bus frames. Feed bytes as they arrive
 * from the wire; receive fully-parsed `DBusMessage`s. Bad framing (invalid
 * LEN, bad XOR) causes the parser to advance one byte at a time and
 * resynchronise at the next valid frame boundary.
 *
 * Call `tickTimeout()` periodically to discard partial buffers when the
 * wire has gone idle mid-frame.
 */
export class DBusFrameStream {
  private buffer: Uint8Array = new Uint8Array(0)
  private lastByteAt = 0
  private readonly idleTimeoutMs: number

  constructor(options: DBusFrameStreamOptions = {}) {
    this.idleTimeoutMs = options.idleTimeoutMs ?? DBUS_RX_BUFFER_TIMEOUT_MS
  }

  /**
   * Feed received bytes. Returns any newly-parsed frames in arrival order.
   * `timestamp` drives the idle-timeout watchdog.
   */
  feed(chunk: Uint8Array, timestamp: number = Date.now()): DBusMessage[] {
    if (chunk.length === 0) return []
    this.buffer = concat(this.buffer, chunk)
    this.lastByteAt = timestamp
    return this.drain()
  }

  /**
   * If the buffer holds bytes and the last byte was received longer than
   * `idleTimeoutMs` ago, discard the partial buffer. Returns true if a
   * flush happened.
   */
  tickTimeout(now: number = Date.now()): boolean {
    if (this.buffer.length === 0) return false
    if (now - this.lastByteAt > this.idleTimeoutMs) {
      this.buffer = new Uint8Array(0)
      return true
    }
    return false
  }

  get pendingByteCount(): number {
    return this.buffer.length
  }

  reset(): void {
    this.buffer = new Uint8Array(0)
    this.lastByteAt = 0
  }

  private drain(): DBusMessage[] {
    const frames: DBusMessage[] = []
    let scan = 0

    while (scan + DBUS_MIN_FRAME_LENGTH <= this.buffer.length) {
      const lengthField = this.buffer[scan + 1]!
      if (lengthField < DBUS_MIN_FRAME_LENGTH || lengthField > DBUS_MAX_MSG_LENGTH) {
        scan++
        continue
      }
      if (scan + lengthField > this.buffer.length) {
        const recovered = this.findValidFrameFrom(scan + 1)
        if (recovered !== null) {
          frames.push(recovered.message)
          scan = recovered.end
          continue
        }
        break
      }
      try {
        frames.push(decode(this.buffer.slice(scan, scan + lengthField)))
        scan += lengthField
      } catch {
        scan++
      }
    }

    this.buffer = this.buffer.slice(scan)
    return frames
  }

  private findValidFrameFrom(start: number): { message: DBusMessage; end: number } | null {
    let s = start
    while (s + DBUS_MIN_FRAME_LENGTH <= this.buffer.length) {
      const lengthField = this.buffer[s + 1]!
      if (lengthField < DBUS_MIN_FRAME_LENGTH || lengthField > DBUS_MAX_MSG_LENGTH) {
        s++
        continue
      }
      if (s + lengthField > this.buffer.length) {
        s++
        continue
      }
      try {
        const message = decode(this.buffer.slice(s, s + lengthField))
        return { message, end: s + lengthField }
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
