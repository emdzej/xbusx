import {
  type Transport,
  type TransportEvents,
  TransportNotOpenError,
  TypedEmitter,
} from '@emdzej/ibusx-core'
import { IBUS_BAUD_RATE } from '@emdzej/ikbus-protocol'

export interface WebSerialTransportOptions {
  /**
   * An already-`requestPort()`-ed `SerialPort`.  The caller is responsible for
   * calling `navigator.serial.requestPort()` inside a user gesture (a click
   * handler); we open it here.
   */
  port: SerialPort
  /** Baud rate.  Defaults to 9600 (`IBUS_BAUD_RATE`). */
  baudRate?: number
  /** Data bits.  Defaults to 8. */
  dataBits?: 7 | 8
  /** Parity.  Defaults to `'even'` (BMW I/K-bus standard). */
  parity?: 'none' | 'even' | 'odd'
  /** Stop bits.  Defaults to 1. */
  stopBits?: 1 | 2
  /** Read buffer.  Defaults to 1024 bytes. */
  bufferSize?: number
}

/**
 * Web Serial transport.  Browser-only — requires a Chromium-based browser
 * over HTTPS or `localhost`.  The caller passes an already-`requestPort()`-ed
 * `SerialPort` so the request happens inside the user gesture that triggered
 * the connection.
 *
 * Teardown follows the WICG-recommended pattern: cancel the active reader so
 * the in-flight `read()` resolves with `done: true`, release the lock, then
 * close the port.
 */
export class WebSerialTransport implements Transport {
  readonly events: TypedEmitter<TransportEvents>
  private readonly port: SerialPort
  private readonly options: Required<WebSerialTransportOptions>
  private reader: ReadableStreamDefaultReader<Uint8Array> | undefined
  private writer: WritableStreamDefaultWriter<Uint8Array> | undefined
  private opened = false
  private readLoopPromise: Promise<void> | undefined

  constructor(options: WebSerialTransportOptions) {
    this.events = new TypedEmitter<TransportEvents>()
    this.port = options.port
    this.options = {
      port: options.port,
      baudRate: options.baudRate ?? IBUS_BAUD_RATE,
      dataBits: options.dataBits ?? 8,
      parity: options.parity ?? 'even',
      stopBits: options.stopBits ?? 1,
      bufferSize: options.bufferSize ?? 1024,
    }
  }

  get isOpen(): boolean {
    return this.opened
  }

  async open(): Promise<void> {
    if (this.opened) return
    await this.port.open({
      baudRate: this.options.baudRate,
      dataBits: this.options.dataBits,
      parity: this.options.parity,
      stopBits: this.options.stopBits,
      bufferSize: this.options.bufferSize,
    })
    if (this.port.readable === null || this.port.writable === null) {
      throw new Error('Web Serial port opened without readable/writable streams.')
    }
    this.reader = this.port.readable.getReader()
    this.writer = this.port.writable.getWriter()
    this.opened = true
    this.events.emit('open')
    // Start the read loop (fire-and-forget, errors go through the emitter).
    this.readLoopPromise = this.readLoop()
  }

  async close(): Promise<void> {
    if (!this.opened) return
    this.opened = false
    if (this.reader !== undefined) {
      try {
        await this.reader.cancel()
      } catch {
        // Reader may already be released by an upstream error; ignore.
      }
    }
    if (this.readLoopPromise !== undefined) {
      try {
        await this.readLoopPromise
      } catch {
        // Errors already surfaced via `events.error`.
      }
    }
    if (this.writer !== undefined) {
      try {
        await this.writer.close()
      } catch {
        // Same — best-effort.
      }
      this.writer = undefined
    }
    try {
      await this.port.close()
    } catch (err) {
      this.events.emit('error', err instanceof Error ? err : new Error(String(err)))
    }
    this.reader = undefined
    this.events.emit('close')
  }

  async write(bytes: Uint8Array): Promise<void> {
    if (!this.opened || this.writer === undefined) {
      throw new TransportNotOpenError()
    }
    await this.writer.write(bytes)
  }

  private async readLoop(): Promise<void> {
    const reader = this.reader
    if (reader === undefined) return
    try {
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        if (value !== undefined && value.byteLength > 0) {
          this.events.emit('data', value)
        }
      }
    } catch (err) {
      this.events.emit('error', err instanceof Error ? err : new Error(String(err)))
    } finally {
      try {
        reader.releaseLock()
      } catch {
        // Already released by cancel(); ignore.
      }
    }
  }
}
