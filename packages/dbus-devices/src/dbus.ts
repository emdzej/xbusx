import {
  DBUS_TESTER_ADDRESS,
  DBusFrameStream,
  type DBusMessage,
  type DeviceAddress,
  encode,
} from '@emdzej/dbus-protocol'
import type { Transport } from '@emdzej/ibusx-core'
import { TypedEmitter } from '@emdzej/ibusx-core'
import { DBusNotStartedError, DBusRequestTimeoutError } from './errors.js'

export type DBusEvents = {
  /** Every successfully-parsed inbound frame. */
  frame: DBusMessage
  /** Every frame emitted to the transport. */
  txFrame: DBusMessage
  /** Transport or parser errors. */
  error: Error
}

export interface DBusRequestOptions {
  /** Per-request timeout in milliseconds. Default: 1000. */
  readonly timeoutMs?: number
}

interface PendingRequest {
  readonly destination: DeviceAddress
  readonly resolve: (message: DBusMessage) => void
  readonly reject: (err: Error) => void
  readonly timer: ReturnType<typeof setTimeout>
}

/**
 * D-bus (BMW DS2) request/response orchestrator. Reads bytes from a
 * `Transport`, parses them via `DBusFrameStream`, and serialises
 * tester → ECU requests so each one resolves with its matching
 * ECU → tester response.
 *
 * D-bus is half-duplex: only one request is in flight at a time. Concurrent
 * callers are queued FIFO.
 *
 * Construct one `DBus` per physical bus. For chassis that expose D-bus on
 * the OBD-II connector in parallel with an active I/K-bus, create both
 * orchestrators independently — they don't share state.
 */
export class DBus {
  readonly transport: Transport
  readonly events: TypedEmitter<DBusEvents>

  private readonly stream = new DBusFrameStream()
  private readonly queue: Array<() => Promise<void>> = []
  private queueRunning = false
  private pending: PendingRequest | undefined
  private timeoutTimer: ReturnType<typeof setInterval> | undefined
  private started = false

  constructor(transport: Transport) {
    this.transport = transport
    this.events = new TypedEmitter<DBusEvents>()

    transport.events.on('data', this.onData)
    transport.events.on('error', this.onTransportError)
  }

  async start(): Promise<void> {
    if (this.started) return
    await this.transport.open()
    this.timeoutTimer = setInterval(() => this.stream.tickTimeout(), 25)
    this.started = true
  }

  async stop(): Promise<void> {
    if (!this.started) return
    if (this.timeoutTimer !== undefined) {
      clearInterval(this.timeoutTimer)
      this.timeoutTimer = undefined
    }
    if (this.pending !== undefined) {
      clearTimeout(this.pending.timer)
      this.pending.reject(new Error('DBus stopped while request was pending'))
      this.pending = undefined
    }
    await this.transport.close()
    this.started = false
  }

  /**
   * Send a raw D-bus request and resolve with the matching response.
   *
   * `frameBytes` must be a complete, valid D-bus frame (typically produced
   * by a builder from `@emdzej/dbus-commands`). The orchestrator writes it
   * to the transport, then waits for a frame whose destination is the
   * tester (`0xF1`). Times out after `options.timeoutMs` (default 1000 ms).
   */
  async request(
    destination: DeviceAddress,
    frameBytes: Uint8Array,
    options: DBusRequestOptions = {},
  ): Promise<DBusMessage> {
    if (!this.started) throw new DBusNotStartedError()
    const timeoutMs = options.timeoutMs ?? 1000
    return this.enqueue(() => this.runRequest(destination, frameBytes, timeoutMs))
  }

  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push(async () => {
        try {
          resolve(await task())
        } catch (err) {
          reject(err instanceof Error ? err : new Error(String(err)))
        }
      })
      void this.drainQueue()
    })
  }

  private async drainQueue(): Promise<void> {
    if (this.queueRunning) return
    this.queueRunning = true
    while (this.queue.length > 0) {
      const task = this.queue.shift()
      if (task !== undefined) await task()
    }
    this.queueRunning = false
  }

  private runRequest(
    destination: DeviceAddress,
    frameBytes: Uint8Array,
    timeoutMs: number,
  ): Promise<DBusMessage> {
    return new Promise<DBusMessage>((resolve, reject) => {
      const timer = setTimeout(() => {
        if (this.pending !== undefined) {
          this.pending = undefined
          reject(new DBusRequestTimeoutError(destination, timeoutMs))
        }
      }, timeoutMs)

      this.pending = { destination, resolve, reject, timer }
      this.events.emit('txFrame', decodeForObservers(frameBytes, destination))
      this.transport.write(frameBytes).catch((err) => {
        if (this.pending !== undefined) {
          clearTimeout(this.pending.timer)
          this.pending = undefined
          reject(err instanceof Error ? err : new Error(String(err)))
        }
      })
    })
  }

  private onData = (chunk: Uint8Array): void => {
    const frames = this.stream.feed(chunk)
    for (const message of frames) {
      this.events.emit('frame', message)
      if (message.destination === DBUS_TESTER_ADDRESS && this.pending !== undefined) {
        const p = this.pending
        this.pending = undefined
        clearTimeout(p.timer)
        p.resolve(message)
      }
    }
  }

  private onTransportError = (err: Error): void => {
    this.events.emit('error', err)
  }
}

/**
 * Construct a `DBusMessage` shape from outbound frame bytes for the `txFrame`
 * event. Best-effort — never throws. If the frame is malformed (shouldn't
 * happen with our builders) we still emit something with a zero checksum so
 * observers can log it.
 */
function decodeForObservers(frameBytes: Uint8Array, destination: DeviceAddress): DBusMessage {
  if (frameBytes.length < 4) {
    return { destination, payload: new Uint8Array(0), checksum: 0 }
  }
  const checksumIndex = frameBytes[1]! - 1
  return {
    destination: frameBytes[0]!,
    payload: frameBytes.slice(2, checksumIndex),
    checksum: frameBytes[checksumIndex] ?? 0,
  }
}

// Re-export for callers that build their own frames inline.
export { encode }
