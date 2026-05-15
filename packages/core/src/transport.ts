import type { TypedEmitter } from './emitter.js'

export type TransportEvents = {
  /** Raw bytes received from the wire. */
  data: Uint8Array
  /** Transport-layer error (port closed, hardware fault, etc.). */
  error: Error
  /** Connection established. */
  open: void
  /** Connection torn down. */
  close: void
}

/**
 * Byte-level transport.  Concrete implementations adapt serial ports,
 * WebSerial, network gateways, in-memory pipes, etc., to a common interface.
 */
export interface Transport {
  readonly events: TypedEmitter<TransportEvents>
  open(): Promise<void>
  close(): Promise<void>
  write(bytes: Uint8Array): Promise<void>
}
