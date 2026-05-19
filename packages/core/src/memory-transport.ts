import { TypedEmitter } from './emitter.js'
import { TransportNotOpenError } from './errors.js'
import type { Transport, TransportEvents } from './transport.js'

export interface MemoryTransportOptions {
  /**
   * If true, every byte written to this transport is echoed back as a `data`
   * event on the next microtask — simulating the wire-loopback behaviour of
   * a real shared-bus transceiver.  Default: false.
   */
  readonly loopback?: boolean
}

/**
 * In-memory transport for tests, replay, and dual-bus scenarios.
 *
 * - Use `inject(bytes)` to simulate a frame arriving from a peer.
 * - Use `MemoryTransport.pair()` to create two linked transports — writes to
 *   one appear as data on the other.  Useful for end-to-end tests across two
 *   `IKBus` instances.
 */
export class MemoryTransport implements Transport {
  readonly events: TypedEmitter<TransportEvents>
  readonly options: MemoryTransportOptions
  private opened = false
  private peer: MemoryTransport | undefined

  constructor(options: MemoryTransportOptions = {}) {
    this.options = options
    this.events = new TypedEmitter<TransportEvents>()
  }

  /**
   * Create a pair of linked transports.  Writes to either appear as `data` on
   * the other (only while both are open).
   */
  static pair(options: MemoryTransportOptions = {}): [MemoryTransport, MemoryTransport] {
    const a = new MemoryTransport(options)
    const b = new MemoryTransport(options)
    a.peer = b
    b.peer = a
    return [a, b]
  }

  async open(): Promise<void> {
    this.opened = true
    this.events.emit('open')
  }

  async close(): Promise<void> {
    this.opened = false
    this.events.emit('close')
  }

  async write(bytes: Uint8Array): Promise<void> {
    if (!this.opened) throw new TransportNotOpenError()
    if (this.options.loopback) {
      queueMicrotask(() => this.events.emit('data', bytes))
    }
    const peer = this.peer
    if (peer?.opened) {
      queueMicrotask(() => peer.events.emit('data', bytes))
    }
  }

  /** Synchronously emit bytes as if received from a peer. */
  inject(bytes: Uint8Array): void {
    this.events.emit('data', bytes)
  }

  get isOpen(): boolean {
    return this.opened
  }
}
