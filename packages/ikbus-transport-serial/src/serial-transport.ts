import {
  type Transport,
  type TransportEvents,
  TransportNotOpenError,
  TypedEmitter,
} from '@emdzej/ibusx-core'
import { IBUS_BAUD_RATE } from '@emdzej/ikbus-protocol'
import { SerialPort } from 'serialport'

export interface SerialTransportOptions {
  /** OS path to the serial device, e.g. `/dev/ttyUSB0` (Mac/Linux) or `COM3` (Windows). */
  path: string
  /** Baud rate.  Defaults to 9600 (`IBUS_BAUD_RATE`). */
  baudRate?: number
  /** Data bits.  Defaults to 8. */
  dataBits?: 5 | 6 | 7 | 8
  /** Parity.  Defaults to `'even'` (BMW I/K-bus standard). */
  parity?: 'none' | 'even' | 'odd'
  /** Stop bits.  Defaults to 1. */
  stopBits?: 1 | 1.5 | 2
}

/**
 * Serial transport using Node's `serialport` package.  Defaults match the
 * BMW I/K-bus wire format (9600 8E1).
 */
export class SerialTransport implements Transport {
  readonly events: TypedEmitter<TransportEvents>
  private port: SerialPort | undefined
  private opened = false
  private readonly options: Required<SerialTransportOptions>

  constructor(options: SerialTransportOptions) {
    this.events = new TypedEmitter<TransportEvents>()
    this.options = {
      path: options.path,
      baudRate: options.baudRate ?? IBUS_BAUD_RATE,
      dataBits: options.dataBits ?? 8,
      parity: options.parity ?? 'even',
      stopBits: options.stopBits ?? 1,
    }
  }

  get isOpen(): boolean {
    return this.opened
  }

  async open(): Promise<void> {
    if (this.opened) return
    await new Promise<void>((resolve, reject) => {
      const port = new SerialPort({
        path: this.options.path,
        baudRate: this.options.baudRate,
        dataBits: this.options.dataBits,
        parity: this.options.parity,
        stopBits: this.options.stopBits,
        autoOpen: false,
      })
      port.on('data', (chunk: Buffer) => {
        // Copy into a plain Uint8Array so consumers can rely on the type.
        this.events.emit('data', new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength))
      })
      port.on('error', (err: Error) => {
        this.events.emit('error', err)
      })
      port.on('close', () => {
        this.opened = false
        this.port = undefined
        this.events.emit('close')
      })
      port.open((err) => {
        if (err !== null && err !== undefined) {
          reject(err)
          return
        }
        this.port = port
        this.opened = true
        this.events.emit('open')
        resolve()
      })
    })
  }

  async close(): Promise<void> {
    const port = this.port
    if (!this.opened || port === undefined) return
    await new Promise<void>((resolve, reject) => {
      port.close((err) => {
        if (err !== null && err !== undefined) {
          reject(err)
          return
        }
        resolve()
      })
    })
  }

  async write(bytes: Uint8Array): Promise<void> {
    const port = this.port
    if (!this.opened || port === undefined) throw new TransportNotOpenError()
    await new Promise<void>((resolve, reject) => {
      port.write(Buffer.from(bytes), (err) => {
        if (err !== null && err !== undefined) {
          reject(err)
          return
        }
        resolve()
      })
    })
  }
}

/** List available serial ports (paths, manufacturers, serial numbers, etc.). */
export async function listSerialPorts(): Promise<Awaited<ReturnType<typeof SerialPort.list>>> {
  return SerialPort.list()
}
